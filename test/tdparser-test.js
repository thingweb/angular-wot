"use strict";

describe("thing description parser service", function() {   
    var TdParser;
    
    beforeEach(module("wot"));
    
    beforeEach(inject(function(_TdParser_){
       TdParser = _TdParser_; 
    }));
    
    beforeEach(function() {
        jasmine.getJSONFixtures().fixturesPath = "base/test/data";
    });
    
    it("should recognize xsd:int as numeric", function() {
        expect(TdParser.isNumericType('xsd:int')).toBe(true);
    });
    
    
    it("should recognize xsd:string as not numeric", function() {
        expect(TdParser.isNumericType('xsd:string')).toEqual(false);
    }); 
    
    it("should be sane", function() {
        expect(true).toBe(true);
    }); 
    
    it("should load a fixture", function () {
        var json = getJSONFixture('fancy_led.old.json')
        expect(json).toBeDefined();
    })
    
    it("should parse an old TD", function () {
        var json = getJSONFixture('fancy_led.old.json')
        var thing = TdParser.createThing(json);
        expect(thing).toBeDefined();
        expect(thing.actions.length).toBe(4);
        expect(thing.properties.length).toBe(5);
    })
    
    it("should parse the example new TD", function () {
        var json = getJSONFixture('simple.new.json')
        var thing = TdParser.createThing(json);
        expect(thing).toBeDefined();
        expect(thing.properties.length).toBe(1);
        expect(thing.name).toBe("MyTemperatureThing")
        var prop = thing.properties[0];
        expect(prop.name).toBe("temperature")
        expect(prop.uri).toBe("coap://www.mytemp.com:5683/temp")
    })
	
    it("should parse the example TD for SantaClara", function () {
        var json = getJSONFixture('td1_v2.json')
        var thing = TdParser.createThing(json);
        expect(thing).toBeDefined();
        expect(thing.properties.length).toBe(1);
        expect(thing.name).toBe("MyTemperatureThing")
        var prop = thing.properties[0];
        expect(prop.name).toBe("temperature")
        expect(prop.uri).toBe("coap://mytemp.example.com:5683/temp")
    })
	
    it("should parse the example TD for SantaClara without base uri", function () {
        var json = getJSONFixture('td2_v2.json')
        var thing = TdParser.createThing(json);
        expect(thing).toBeDefined();
        expect(thing.properties.length).toBe(1);
        expect(thing.name).toBe("MyTemperatureThing")
        var prop = thing.properties[0];
        expect(prop.name).toBe("temperature")
        expect(prop.uri).toBe("coap://mytemp.example.com:5683/temp")
    })
	
    
    it("should not choke on unknown fields", function () {
        var json = getJSONFixture('example3.new.json')
        var thing = TdParser.createThing(json);
        expect(thing).toBeDefined();
        expect(thing.properties.length).toBe(1);
        expect(thing.name).toBe("MyLEDThing")
        var prop = thing.properties[0];
        expect(prop.name).toBe("status")
        expect(prop.uri).toBe("http://www.myled.com:8080/myled/status")
    })
});