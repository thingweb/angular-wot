var wot = angular.module("wot",['coap']);

angular.module("wot").factory('TdParser', ['$http', 'CoAP',
    function TdParserFactory($http, CoAP) {
        var TdParser = {};

        var numericTypes = [
            'xsd:byte',
            'xsd:float',
            'xsd:decimal',
            'xsd:int',
            'xsd:long',
            'xsd:unsignedByte',
            'xsd:unsignedShort'
        ];

        TdParser.isNumericType = function isNumericType(xsdType) {
            return numericTypes.indexOf(xsdType) != -1;
        }
        
        var createThingfromOldTd =  function createThingfromOldTd(parsedTd) {
            var newThing = {
                'name': parsedTd.metadata.name,
                'properties': [],
                'actions': [],
                'uri': (parsedTd.metadata.protocols.HTTP) ? parsedTd.metadata.protocols.HTTP.uri : parsedTd.metadata.protocols.CoAP.uri, //FIXME dodgy
                'protocols': parsedTd.metadata.protocols
            };

            //add all properties
            parsedTd.interactions
                .filter(function isProperty(interaction) {
                    return interaction["@type"] == "Property";
                })
                .forEach(function addProperty(property) {
                    newThing.properties.push({
                        'name': property.name,
                        'writable': property.writable,
                        'xsdType': property.outputData,
                        'autoUpdate': false,
                        'history': [],
                        'parent': newThing,
                        'isNumeric': TdParser.isNumericType(property.outputData)
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
                        'xsdParamType': action.inputData,
                        'xsdReturnType': action.outputData,
                        'parent': newThing
                    });
                });

            return newThing;
        }

        var chooseUriIndex = function chooseUriIndex(uriArray) {
            prefIdx = -1;
            for(i=0;i<uriArray.length;i++) {
                var uri = uriArray[i];
                var scheme = uri.substring(0,uri.indexOf(':'));
                if(scheme === 'http')
                    return i;
                else if (scheme === 'coap')
                    prefIdx = i;
            };
            return prefIdx;
            
        }

        var pathConcat = function pathConcat(left, right) {
            if(left.slice(-1) === '/') {
               return left + right; 
            } else {
                return left + '/' + right;
            }
        }

        var createThingfromNewTd =  function createThingfromNewTd(parsedTd) {
            var uriArray = ( parsedTd.uris instanceof Array ) ? parsedTd.uris : [parsedTd.uris];
            var uriIndex = chooseUriIndex(uriArray);
            if(uriIndex === -1) throw Error("no suitable Protocols found")
            var newThing = {
                'name': parsedTd.name,
                'properties': [],
                'actions': [],
                'uri': uriArray[uriIndex]
            };

            //add all properties
            if(parsedTd.properties) parsedTd.properties
                .forEach(function addProperty(property) {
                    newThing.properties.push({
                        'name': property.name,
                        'writable': property.writable,
                        'xsdType': property.valueType,
                        'type': property.valueType['type'],
                        'uri': pathConcat(newThing.uri,property.hrefs[uriIndex]),
                        'autoUpdate': false,
                        'history': [],
                        'parent': newThing,
                        'isNumeric': TdParser.isNumericType(property.valueType),
                        'properties': property.valueType['properties']
                    });
                });

            //add actions
            if(parsedTd.actions) parsedTd.actions
                .forEach(function addAction(action) {
                    var paramType = (action.inputData) ? action.inputData.valueType['type'] :"";
                    
                    newThing.actions.push({
                        'name': action.name,
                        'xsdParamType': paramType, //misleading name: xsd
                        'numericParamType': TdParser.isNumericType(paramType), //Unused in UI
                        'inputProperties': (action.inputData) ? action.inputData.valueType['properties'] :"",
                        'xsdReturnType': (action.outputData) ? action.outputData.valueType['type'] : "", //should not be xsd
                        'parent': newThing,
                        'uri' : pathConcat(newThing.uri,action.hrefs[uriIndex])
                    });
                });

            return newThing;
        }

       TdParser.createThing = function dualParseTD(tdObj){
            if(tdObj.metadata)
                return createThingfromOldTd(tdObj);
               else
                return createThingfromNewTd(tdObj);
        }

        TdParser.fromUrl = function fromUrl(url) {
            if (url.substring(0, 4) == 'coap') {
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

angular.module("wot").factory('ThingClient', ['$http', 'CoAP',
    function ThingClientFactory($http, CoAP) {
        var ThingClient = {};

        var restcall = function restcall(method, uri, payload) {
            var scheme = uri.substring(0, uri.indexOf(':'));
            if (scheme === 'http') {
                var req = {
                    'method': method,
                    'url': uri,
                    'data': payload
                };
                return $http(req);
            } else if (scheme === 'coap') {
                return CoAP.doCoapReq(method, uri, JSON.stringify(payload))
                    .then($http.defaults.transformResponse);
            } else
                throw Error('unknown uri scheme')
        }

        ThingClient.readProperty = function readProperty(thing, property) {
            function applyNewValue(value) {
                property.value = value;
                property.history.push(value);

                //ensure size
                while (property.history.length >= 20) property.history.shift();
            }

            if (property.uri) {
                return restcall('GET', property.uri)
                    .then(function (res) {
                        if (res.data)
                            return res.data.value;
                        else
                            return JSON.parse(res).value;

                    })
                    .then(applyNewValue);
            }

            if (thing.protocols['HTTP']) {
                return $http.get(thing.protocols['HTTP'].uri + "/" + property.name)
                    .then(function (res) { return res.data.value })
                    .then(applyNewValue);
            } else if (thing.protocols['CoAP']) {
                return CoAP.get(thing.protocols['CoAP'].uri + "/" + property.name)
                    .then(function (res) {
                        return JSON.parse(res.payload).value
                    })
                    .then(applyNewValue);
            }
        }

        ThingClient.writeProperty = function writeProperty(thing, property) {
            if (property.uri) {
                return restcall('PUT', property.uri, { "value": property.value })
            }

            if (thing.protocols['HTTP']) {
                return $http.put(thing.protocols['HTTP'].uri + "/" + property.name, { "value": property.value })
            } else {
                return CoAP.put(thing.protocols['CoAP'].uri + "/" + property.name, { "value": property.value })
            }
        }

        ThingClient.callAction = function callAction(thing, action, param) {
            var payload = { "value": param };
            if (action.xsdParamType === 'WoTScript') {
                payload = param;
            };

            if (action.uri) {
                return restcall('POST', action.uri, payload)
            }

            if (thing.protocols['HTTP']) {
                return $http.post(thing.protocols['HTTP'].uri + "/" + action.name, payload);
            } else {
                return CoAP.post(thing.protocols['CoAP'].uri + "/" + action.name, payload);
            }
        }

        return ThingClient;
    }
]);
