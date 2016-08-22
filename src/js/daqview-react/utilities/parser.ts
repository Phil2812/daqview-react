namespace DAQAggregator {

    import RU = DAQAggregator.Snapshot.RU;
    import FEDBuilder = DAQAggregator.Snapshot.FEDBuilder;
    import SubFEDBuilder = DAQAggregator.Snapshot.SubFEDBuilder;
    import FED = DAQAggregator.Snapshot.FED;
    import FRL = DAQAggregator.Snapshot.FRL;
    export class SnapshotParser {

        private big_map: {[key: string]: any} = {};
        private level: number = 1;

        public parse(snapshot: {}): Snapshot {

            this.explore(snapshot);

            for (var key in this.big_map) {
                this.scanAndReplace(this.big_map[key]);
            }
            return new Snapshot(this.big_map['DAQ']);
        }

        static getFieldType(field: any) {
            var ret = typeof field;
            if ((ret == 'object') && (field instanceof Array)) {
                ret = 'array';
            }
            if (field === null) {
                ret = 'null';
            }
            return ret;
        }

        explore(obj: {[key: string]: any}): void {
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
                            if (objTypeLiteral == 'object') {  //non array object
                                obj["ref_" + key] = elem["@id"];
                                delete obj[key];
                            } else {
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
        }

        scanAndReplace(obj: {[key: string]: any}): void {
            for (var key in obj) { // iterate, `key` is the property key
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
                        let arr: any[] = [];
                        let elemArray: any[] = <any[]> elem;

                        for (let idx: number = 0; idx < elemArray.length; idx++) {
                            arr[idx] = this.big_map[elemArray[idx]];
                        }
                        obj[key] = arr;
                    } else if (elemTypeLiteral == 'object') {
                        var o: {[key: string]: any} = {};
                        for (var pName in elem) {
                            if (elem.hasOwnProperty(pName)) {
                                o[pName] = this.big_map[elem[pName]];
                            }
                        }
                        obj[key] = o;
                    } else if ((elemTypeLiteral == 'number') || (elemTypeLiteral == 'string')) {
                        obj[key] = this.big_map[elem];

                    }

                    obj[key.substring(4)] = obj[key];
                    delete (obj[key]);
                }
            }
        }


    }

    export class RUWarnMessageAggregator {
        public resolveRUWarnings(snapshot: Snapshot): Snapshot {
            //retrieve and assign warning messages to RUs
            let rus: RU[] = snapshot.getDAQ().rus;

            for (let idx: number = 0; idx < rus.length; idx++) {
                rus[idx].warningsFromFeds = this.getWarnInfoForRU(rus[idx]);
            }

            return snapshot;
        }

        //returns warning objects indexed by FED
        getWarnInfoForRU(ru: RU): {[key: string]: RUFEDWarningObject} {

            //fed: warnings
            let ruWarnings: {[key: string]: RUFEDWarningObject} = {};
            //iterate all messages from feds
            let fedBuilder: FEDBuilder = ru.fedBuilder;
            for (var subFEDBuilder of fedBuilder.subFedbuilders){
               for(var frl of (<SubFEDBuilder>subFEDBuilder).frls){
                   let feds: {[key: number]: FED} = (<FRL>frl.feds);
                   for (var fedSlot in feds){
                       let fed: FED = feds[fedSlot];

                       let warningObj: RUFEDWarningObject = new RUFEDWarningObject();
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
        }

    }

    export class RUFEDWarningObject{
        ruFedInError: boolean;
        ruFedBXError: number;
        ruFedCRCError: number;
        ruFedDataCorruption: number;
        ruFedOutOfSync: number;
        ruFedWithoutFragments: boolean;
    }

}