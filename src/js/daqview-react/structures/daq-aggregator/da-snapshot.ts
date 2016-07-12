namespace DAQAggregator {

    export class Snapshot {
        private snapshot: any;
        private daq: Snapshot.DAQ;

        constructor(snapshotObject: {[key: string]: any}) {
            this.processSnapshot(snapshotObject);
        }

        private processSnapshot(snapshot: any) {
            this.snapshot = snapshot;
            this.daq = snapshot;
        }

        public getDAQ() {
            return this.daq;
        }

        public getUpdateTimestamp() {
            return this.daq.lastUpdate;
        }
    }

    export namespace Snapshot {

        export interface DAQ {
            lastUpdate: number;

            sessionId: number;
            runNumber: number;
            dpsetPath: string;

            daqState: string;
            levelZeroState: string;
            // lhcMachineMode: string;
            // lhcBeamMode: string;

            fedBuilders: FEDBuilder[];
            bus?: BU[];

            fedBuilderSummary: FEDBuilderSummary;
            buSummary: BUSummary;
        }

        export interface FEDBuilder {
            name: string;
            ru?: RU;
            subFedbuilders?: SubFEDBuilder[];
        }

        export interface BUSummary {
            rate: number;
            throughput: number;

            eventSizeMean: number;
            eventSizeStddev: number;

            numEvents: number;
            numEventsInBU: number;

            priority: number;

            numRequestsSent: number;
            numRequestsUsed: number;
            numRequestsBlocked: number;

            numFUsHlt: number;
            numFUsCrashed: number;
            numFUsStale: number;
            numFUsCloud: number;

            ramDiskUsage: number;
            ramDiskTotal: number;
            numFiles: number;

            numLumisectionsWithFiles: number;
            currentLumisection: number;

            numLumisectionsForHLT: number;
            numLumisectionsOutHLT: number;

            fuOutputBandwidthInMB: number;
        }

        export interface FEDBuilderSummary {
            rate: number;
            throughput: number;

            superFragmentSizeMean: number;
            superFragmentSizeStddev: number;

            deltaEvents: number;

            sumFragmentsInRU: number;
            sumEventsInRU: number;
            sumRequests: number;
        }

        export interface BU {
            hostname: string;

            rate: number;
            throughput: number;

            eventSizeMean: number;
            eventSizeStddev: number;

            numEvents: number;
            numEventsInBU: number;

            priority: number;

            numRequestsSent: number;
            numRequestsUsed: number;
            numRequestsBlocked: number;

            numFUsHlt: number;
            numFUsCrashed: number;
            numFUsStale: number;
            numFUsCloud: number;

            ramDiskUsage: number;
            ramDiskTotal: number;
            numFiles: number;

            numLumisectionsWithFiles: number;
            currentLumisection: number;

            numLumisectionsForHLT: number;
            numLumisectionsOutHLT: number;

            fuOutputBandwidthInMB: number;
        }

        export interface RU {
            hostname: string;
            isEVM: boolean;
            // masked: boolean;
            // instance: number;

            // stateName: string;
            errorMsg: string;
            warnMsg: string;
            infoMsg: string;

            rate: number;
            throughput: number;

            superFragmentSizeMean: number;
            superFragmentSizeStddev: number;

            fragmentsInRU: number;
            eventsInRU: number;
            requests: number;

            // #events missing?

            // status: string;
            // incompleteSuperFragmentCount: number;

        }

        export interface SubFEDBuilder {
            minTrig: number;
            maxTrig: number;
            frlPc?: FRLPc;
            frls?: FRL[];
            ttcPartition?: TTCPartition;
        }

        export interface TTCPartition {
            name: string;
            ttsState: string;
            percentWarning: number;
            percentBusy: number;
            fmm?: FMM;
        }

        export interface FMM {
            geoslot: number;
            url: string;
            feds?: FED[];
        }

        export interface FRLPc {
            hostname: string;
            // masked: boolean;
            // frls?: FRL[];
            // crashed: boolean;
        }

        export interface FRL {
            geoSlot: number;
            // type: string;

            feds?: {[key: number]: FED};

            // state: string;
            // substate: string;

            // url: string;
        }

        export interface FED {
            id: number;

            fmm?: FMM;
            frlIO: number;
            fmmIO: number;

            srcIdExpected: number;

            mainFeds?: FED[];

            srcIdReceived: number;

            percentBackpressure: number;
            percentWarning: number;
            percentBusy: number;

            ttsState?: string;

            numSCRCerrors: number;
            numFRCerrors: number;
            numTriggers: number;
            eventCounter: number;

            fmmMasked: boolean;
            frlMasked: boolean;

            hasSLINK: boolean;
            hasTTS: boolean;
        }

    }

}