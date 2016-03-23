var wot = angular.module("wot",['coap']);

angular.module("wot").factory('TdParser',['$http','CoAP',
  function TdParserFactory($http,CoAP) {
    var TdParser = {};

    //helper functions
    function isNumericType(xsdType) {
       var numericTypes = [
         'xsd:byte',
         'xsd:float',
         'xsd:decimal',
         'xsd:int',
         'xsd:long',
         'xsd:unsignedByte',
         'xsd:unsignedShort'
       ];
       return numericTypes.indexOf(xsdType) != -1;
    }

  TdParser.createThing = function createThing(parsedTd) {
      var newThing = {
        'name' : parsedTd.metadata.name,
        'properties' : [],
        'actions': [],
        'uri': (parsedTd.metadata.protocols.HTTP) ? parsedTd.metadata.protocols.HTTP.uri : parsedTd.metadata.protocols.CoAP.uri, //FIXME dodgy
        'protocols' : parsedTd.metadata.protocols
      };

      //add all properties
      parsedTd.interactions
       .filter(function isProperty(interaction) {
         return interaction["@type"] == "Property";
       })
       .forEach(function addProperty(property) {
         newThing.properties.push({
           'name': property.name,
           'writable' : property.writable,
           'xsdType' : property.outputData,
           'autoUpdate' : false,
           'history' : [],
           'parent' : newThing,
           'isNumeric' : function isNumeric() {
             return isNumericType(this.xsdType);
           }
         });
       });

       //add actions
       parsedTd.interactions
        .filter(function isAction(interaction) {
          return interaction["@type"] == "Action";
        })
        .forEach(function addAction(action) {
          newThing.actions.push({
            'name': action.name,
            'xsdParamType' : action.inputData,
            'xsdReturnType' : action.outputData,
            'parent' : newThing
          });
        });

        return newThing;
    }

    TdParser.fromUrl = function fromUrl(url) {
      if(url.substring(0,4)=='coap') {
        return CoAP.get(url)
        .then(function(res) {
          return JSON.parse(res)
        })
        .then(TdParser.createThing)
      } else
        return $http.get(url).then(function(res) {
          return res.data
        }).then(TdParser.createThing)
    }

    TdParser.parseJson = function parseJson(json) {
      // TODO actually parse as JSON-LD, e.g. using io-informatics/angular-jsonld
      var td = JSON.parse(json);
      return TdParser.createThing(td);
    }

    return TdParser;
  }
]);

angular.module("wot").factory('ThingClient',['$http','CoAP',
  function ThingClientFactory($http,CoAP) {
    var ThingClient = {};



    ThingClient.readProperty = function readProperty(thing,property) {
      function applyNewValue(value) {
        property.value = value;
        property.history.push(value);

        //ensure size
        while(property.history.length >= 20) property.history.shift();
      }

      if(thing.protocols['HTTP']) {
        return $http.get(thing.protocols['HTTP'].uri + "/" + property.name)
         .then(function(res) {return res.data.value})
         .then(applyNewValue);
     } else if(thing.protocols['CoAP']) {
       return CoAP.get(thing.protocols['CoAP'].uri + "/" + property.name)
        .then(function(res) {
          return JSON.parse(res).value
          })
        .then(applyNewValue);
     }
    }

    ThingClient.writeProperty = function writeProperty(thing,property) {
      if(thing.protocols['HTTP']) {
        return $http.put(thing.protocols['HTTP'].uri + "/" + property.name, {"value" : property.value})
      } else {
        return CoAP.put(thing.protocols['CoAP'].uri + "/" + property.name, {"value" : property.value})
      }
    }

    ThingClient.callAction = function callAction(thing,action,param) {
      var payload = {"value" : param};
      if(action.xsdParamType === 'WoTScript') {
        payload = param;
      };

      if(thing.protocols['HTTP']) {
        return $http.post(thing.protocols['HTTP'].uri + "/" + action.name, payload);
      } else {
        return CoAP.post(thing.protocols['CoAP'].uri + "/" + action.name, payload);
      }
    }

    return ThingClient;
  }
]);
