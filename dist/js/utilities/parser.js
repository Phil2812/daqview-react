var DAQAggregator;
(function (DAQAggregator) {
    var SnapshotParser = (function () {
        function SnapshotParser() {
            this.big_map = {};
            this.level = 1;
        }
        SnapshotParser.prototype.parse = function (snapshot) {
            this.explore(snapshot);
            for (var key in this.big_map) {
                this.scanAndReplace(this.big_map[key]);
            }
            return new DAQAggregator.Snapshot(this.big_map['DAQ']);
        };
        SnapshotParser.getFieldType = function (field) {
            var ret = typeof field;
            if ((ret == 'object') && (field instanceof Array)) {
                ret = 'array';
            }
            if (field === null) {
                ret = 'null';
            }
            return ret;
        };
        SnapshotParser.prototype.explore = function (obj) {
            for (var key in obj) {
                var elem = obj[key];
                //stores all objects with an @id attribute
                if ((key == "@id")) {
                    this.big_map[elem] = obj;
                }
                var elemTypeLiteral = SnapshotParser.getFieldType(elem);
                var objTypeLiteral = SnapshotParser.getFieldType(obj);
                var doPrependArrayName = false;
                if (elemTypeLiteral == 'array') {
                    if ((elem.length > 0) && (SnapshotParser.getFieldType(elem[0]) == 'object') && elem[0].hasOwnProperty("@id")) {
                        doPrependArrayName = true;
                    }
                }
                if (typeof elem === "object") {
                    this.level++; //will pass to child
                    if (this.level <= 3) {
                        this.explore(elem);
                    }
                    //upon return from an object (so that its definition has already been stored), if it has @id field, replace its definition with a reference to its @id, at parent
                    if (elemTypeLiteral != 'null') {
                        if (elem.hasOwnProperty("@id")) {
                            if (objTypeLiteral == 'object') {
                                obj["ref_" + key] = elem["@id"];
                                delete obj[key];
                            }
                            else {
                                obj[key] = elem["@id"];
                            }
                        }
                    }
                    if (doPrependArrayName) {
                        obj["ref_" + key] = elem;
                        delete obj[key];
                    }
                    this.level--; //will pass to father
                }
            }
        };
        SnapshotParser.prototype.scanAndReplace = function (obj) {
            for (var key in obj) {
                var elem = obj[key]; // `obj[key]` is the value
                var elemTypeLiteral = SnapshotParser.getFieldType(elem);
                //further explore objects or arrays with recursion
                //will check if contains reference ids and will replace them with actual object references upon return
                var replaceContent = false;
                if (key.indexOf('ref') > -1) {
                    replaceContent = true;
                }
                if (typeof elem === "object") {
                    this.scanAndReplace(elem); // call recursively
                }
                if (replaceContent) {
                    //array of references, object of values which are references, single field reference
                    if (elemTypeLiteral == 'array') {
                        var arr = [];
                        var elemArray = elem;
                        for (var idx = 0; idx < elemArray.length; idx++) {
                            arr[idx] = this.big_map[elemArray[idx]];
                        }
                        obj[key] = arr;
                    }
                    else if (elemTypeLiteral == 'object') {
                        var o = {};
                        for (var pName in elem) {
                            if (elem.hasOwnProperty(pName)) {
                                o[pName] = this.big_map[elem[pName]];
                            }
                        }
                        obj[key] = o;
                    }
                    else if ((elemTypeLiteral == 'number') || (elemTypeLiteral == 'string')) {
                        obj[key] = this.big_map[elem];
                    }
                    obj[key.substring(4)] = obj[key];
                    delete (obj[key]);
                }
            }
        };
        return SnapshotParser;
    }());
    DAQAggregator.SnapshotParser = SnapshotParser;
    var RUWarnMessageAggregator = (function () {
        function RUWarnMessageAggregator() {
        }
        RUWarnMessageAggregator.prototype.resolveRUWarnings = function (snapshot) {
            //retrieve and assign warning messages to RUs
            var rus = snapshot.getDAQ().rus;
            for (var idx = 0; idx < rus.length; idx++) {
                rus[idx].warningsFromFeds = this.getWarnInfoForRU(rus[idx]);
            }
            return snapshot;
        };
        //returns warning objects indexed by FED
        RUWarnMessageAggregator.prototype.getWarnInfoForRU = function (ru) {
            //fed: warnings
            var ruWarnings = {};
            //iterate all messages from feds
            var fedBuilder = ru.fedBuilder;
            for (var _i = 0, _a = fedBuilder.subFedbuilders; _i < _a.length; _i++) {
                var subFEDBuilder = _a[_i];
                for (var _b = 0, _c = subFEDBuilder.frls; _b < _c.length; _b++) {
                    var frl = _c[_b];
                    var feds = frl.feds;
                    for (var fedSlot in feds) {
                        var fed = feds[fedSlot];
                        var warningObj = new RUFEDWarningObject();
                        warningObj.ruFedInError = fed.ruFedInError;
                        warningObj.ruFedBXError = fed.ruFedBXError;
                        warningObj.ruFedCRCError = fed.ruFedCRCError;
                        warningObj.ruFedDataCorruption = fed.ruFedDataCorruption;
                        warningObj.ruFedOutOfSync = fed.ruFedOutOfSync;
                        warningObj.ruFedWithoutFragments = fed.ruFedWithoutFragments;
                        ruWarnings[fed.srcIdExpected] = warningObj; //add info to this RU, for a fed indexed by its expectedSrcId
                    }
                }
            }
            return ruWarnings;
        };
        return RUWarnMessageAggregator;
    }());
    DAQAggregator.RUWarnMessageAggregator = RUWarnMessageAggregator;
    var RUFEDWarningObject = (function () {
        function RUFEDWarningObject() {
        }
        return RUFEDWarningObject;
    }());
    DAQAggregator.RUFEDWarningObject = RUFEDWarningObject;
})(DAQAggregator || (DAQAggregator = {}));
