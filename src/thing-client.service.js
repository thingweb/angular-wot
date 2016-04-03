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
                return CoAP.doCoapReq(method, uri, payload)
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
                    .then(function(res) { return res.data.value })
                    .then(applyNewValue);
            }

            if (thing.protocols['HTTP']) {
                return $http.get(thing.protocols['HTTP'].uri + "/" + property.name)
                    .then(function(res) { return res.data.value })
                    .then(applyNewValue);
            } else if (thing.protocols['CoAP']) {
                return CoAP.get(thing.protocols['CoAP'].uri + "/" + property.name)
                    .then(function(res) {
                        return JSON.parse(res).value
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

            if (property.uri) {
                return restcall('POST', property.uri, payload)
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
