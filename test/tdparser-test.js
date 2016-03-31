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
    
});