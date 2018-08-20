/**
 * @author Michail Vougioukas
 * @author Philipp Brummer
 */

declare class ReconnectingWebSocket {
    constructor(url: string, protocols?: string | string[], options?: {[key: string]: any});
    addEventListener(event: string, handler: (message: any) => void): void;
    close(code?: number, reason?: string): void;
    reconnect(code?: number, reason?: string): void;

    readyState: number;
}

namespace DAQAggregator {

    import DAQSnapshotView = DAQView.DAQSnapshotView;
    import DAQAggregatorSnapshot = DAQAggregator.Snapshot;
    import SnapshotSource = DAQAggregator.SnapshotSource;

    const WEBSOCKET_CONNECTING: number = 0;

    export class SnapshotProvider implements DAQSnapshotView {
        private snapshotSource: SnapshotSource;
        private running: boolean = false;
        private inRealTimePolling: boolean = true;
        private instructionToStop:boolean = false;

        private drawPausedPage: boolean = false;
        private drawDataFlowIsZero: boolean = false;
        private drawStaleSnapshot: boolean = false;

        private previousUrl: string = "";
        private pauseCallerType: number = 0; //by default all pause calls are asssumed to be originated from the real time mode

        private useWebSocket: boolean = true;
        private ws: ReconnectingWebSocket = null;
        private wsReconnecting = false;

        private lastSnapshot: Snapshot;
        private lastSnapshotTime: number;
        private lastSnapshotRequestTime: number;

        private views: DAQSnapshotView[] = [];

        private mapOfMonths: {[key: string]: string} =
        {
            "Jan" : "01",
            "Feb" : "02",
            "Mar" : "03",
            "Apr" : "04",
            "May" : "05",
            "Jun" : "06",
            "Jul" : "07",
            "Aug" : "08",
            "Sep" : "09",
            "Oct" : "10",
            "Nov" : "11",
            "Dec" : "12"
        };

        constructor(snapshotSource: SnapshotSource) {
            this.snapshotSource = snapshotSource;
        }

        public addView(view: DAQSnapshotView) {
            this.views.push(view);
        }

        public prePassElementSpecificData(args: string[]){
            this.views.forEach(
                view => view.prePassElementSpecificData(args)
            );
        }

        public setSnapshot(snapshot: Snapshot, drawPausedPage: boolean, drawZeroDataFlowComponent:boolean, drawStaleSnapshot:boolean) {
            this.views.forEach(
                view => view.setSnapshot(snapshot, drawPausedPage, drawZeroDataFlowComponent, drawStaleSnapshot));
        }

        public isRunning(): boolean {
            return this.running;
        }

        public isInRealTimePolling(): boolean {
            return this.inRealTimePolling;
        }

        public start() {
            console.log(("Snapshot provided start() at: "+new Date().toISOString()));

            if (this.running) {
                return;
            }
            this.running = true;

            if (this.useWebSocket) {
                this.connectWebSocket();
            }

            let updateFunction: () => void = (function () {
                if (!this.running) {
                    return;
                }

                //retrieves previous url for local use, before updating its value is updated
                let previousUrlTemp: string = this.previousUrl;

                let url: string = this.snapshotSource.getSourceURL(); //url to snapshot source, not to daqview (must be compatible with server's expected format)

                if (!this.inRealTimePolling){
                    url = this.snapshotSource.getSourceURLForGotoRequests();
                    console.log('In go-to-time snapshot provider mode');
                }else{
                    console.log('In real-time snapshot provider mode');
                }

                //updates global previousUrl holder with this call's url and current timestamp (only to be used with possible subsequent go-to-time request)
                this.previousUrl = url+"&time=\""+(new Date().toISOString())+"\""; //quotes for server url compatibility


                //at this point, this will stop the provider after completing the current snapshot request and daqview update
                if (this.instructionToStop){
                    console.log('Instructed to stop');
                    this.stop();
                    this.instructionToStop = false; //reset value immediately: it only needs to be true once and then be clean for later usages of the method
                    this.drawPausedPage = true; //triggers page draw with pause color scheme

                    /*retain previous snapshot if instruction to stop has been called from real-time mode,
                     otherwise draw requested snaphost if instruction to stop is a result of a go-to-time request*/
                    if (this.pauseCallerType == 0){
                        url = previousUrlTemp;
                        console.log('Paused in real-time mode');
                    }else{
                        console.log('Paused after point time query');
                    }

                    if (this.useWebSocket) {
                        this.requestSnapshot(url, updateFunction);
                    }
                }

                // detect staleness for websocket-mode
                if (this.useWebSocket) {
                    this.lastSnapshotRequestTime = new Date().getTime();
                    let previousStaleness = this.drawStaleSnapshot;
                    this.detectStaleness();
                    if (this.drawStaleSnapshot != previousStaleness) {
                        this.setSnapshot(this.lastSnapshot, this.drawPausedPage, this.drawDataFlowIsZero, this.drawStaleSnapshot);
                    }
                }

                if (!this.useWebSocket) {
                    this.requestSnapshot(url, updateFunction);
                } else {
                    setTimeout(updateFunction, this.snapshotSource.updateInterval);
                }

            }).bind(this);


            setTimeout(updateFunction, this.snapshotSource.updateInterval);
        }

        //this method will immediately stop page updating (including both values and graphics)
        public stop() {
            this.running = false;
            this.disconnectWebSocket();
        }

        public switchToPolling() {
            this.useWebSocket = false;
        }

        public switchToWebSocket() {
            this.useWebSocket = true;
        }

        public switchToRealTime(){
            this.inRealTimePolling = true;
        }

        public switchToGotoTimeRequests(){
            this.inRealTimePolling = false;
        }

        /*arg 0 if called from a real time updating context, arg 1 if called from a go-to-time-and-pause context*/
        public provideOneMoreSnapshotAndStop(callerType: number){
            this.pauseCallerType = callerType;
            this.instructionToStop = true;
        }

        private connectWebSocket() {
            if (this.ws !== null) {
                if (!this.wsReconnecting) {
                    this.wsReconnecting = true;
                    this.ws.reconnect();
                }
            } else {
                this.ws = new ReconnectingWebSocket(this.snapshotSource.getWebSocketURL(), null, {
                    maxReconnectionDelay: 2000,
                    minReconnectionDelay: 1000,
                    minUptime: 5000,
                    reconnectionDelayGrowFactor: 1.2,
                    connectionTimeout: 2500,
                    maxRetries: Infinity,
                    debug: false
                });

                this.ws.addEventListener('open', () => {
                    console.log("WebSocket opened.");
                    this.wsReconnecting = false;
                });

                this.ws.addEventListener('close', (reason) => {
                    console.log("WebSocket closed.");
                    console.log(reason);
                    if (this.running) {
                        this.snapshotFail();
                        this.connectWebSocket();
                    }
                });

                this.ws.addEventListener('error', (error) => {
                    console.log("WebSocket error received.");
                    console.log(error);
                });

                this.ws.addEventListener('message', (message) => {
                    console.log("WebSocket message received.");

                    let url = this.snapshotSource.getSourceURL();
                    let startTime: number = new Date().getTime();
                    let serverTime: number = startTime;

                    let snapshot = JSON.parse(message.data);

                    this.snapshotDone(snapshot, startTime, url, serverTime);
                });
            }
        }

        private disconnectWebSocket() {
            this.ws.close();
        }

        private requestSnapshot(url: string, updateFunction: () => void) {
            let startTime: number = new Date().getTime();
            let snapshotRequest = jQuery.getJSON(url);

            snapshotRequest.done((function (snapshotJSON: any) {

                let serverResponseTime: number = new Date(snapshotRequest.getResponseHeader("Date")).getTime();
                this.snapshotDone(snapshotJSON, startTime, url, serverResponseTime);

                setTimeout(updateFunction, this.snapshotSource.updateInterval);
            }).bind(this));

            snapshotRequest.fail((function (){
                this.snapshotFail();
                setTimeout(updateFunction, this.snapshotSource.updateInterval);
            }).bind(this));
        }

        private snapshotDone(snapshotJSON: any, startTime: number, url: string, serverResponseTime: number) {
            let time: number = new Date().getTime() - startTime;
            console.log('Time to get snapshot: ' + time + 'ms');

            let malformedSnapshot: boolean = false;

            if ((snapshotJSON == null)||(!snapshotJSON.hasOwnProperty("@id"))) {
                console.log("Malformed snapshot received, parsing and updating won't be launched until next valid snapshot");
                console.log(snapshotJSON);
                malformedSnapshot = true;
                let snapshot: Snapshot;

                let errorMsg: string = "Could not find DAQ snapshot with requested params";

                if (snapshotJSON != null) {
                    if (snapshotJSON.hasOwnProperty("message")) {
                        errorMsg = snapshotJSON.message;
                    }
                }

                console.error(errorMsg);

                this.setSnapshot(snapshot, this.drawPausedPage, false, false); //maybe also pass message to setSnapshot?
                //reset value after use
                this.drawPausedPage = false;
            }

            if (!malformedSnapshot) {
                let snapshot: Snapshot;
                startTime = new Date().getTime();
                if (this.snapshotSource.parseSnapshot) {
                    snapshot = this.snapshotSource.parseSnapshot(snapshotJSON);
                } else {
                    snapshot = new Snapshot(snapshotJSON);
                }
                time = new Date().getTime() - startTime;
                console.log('Time to parse snapshot: ' + time + 'ms');

                startTime = new Date().getTime();

                //null snapshot can be caused by indefinite chain of elements in the received json
                if (snapshot != null) {

                    this.lastSnapshot = snapshot;

                    //discover if data flow rate is zero
                    this.drawDataFlowIsZero = false;

                    let daq: DAQAggregatorSnapshot.DAQ = snapshot.getDAQ();
                    if (daq.fedBuilderSummary.rate == 0) {
                        daq.fedBuilders.forEach(fedBuilder => {
                            if (fedBuilder.ru != null && fedBuilder.ru.isEVM) {
                                if (fedBuilder.ru.stateName === "Enabled") {
                                    this.drawDataFlowIsZero = true;
                                }
                            }
                        });
                    }

                    //discover if snapshot is stale

                    let dataTime: number = new Date(daq.lastUpdate).getTime();
                    this.snapshotSource.currentSnapshotTimestamp = dataTime;

                    this.lastSnapshotRequestTime = serverResponseTime;
                    this.lastSnapshotTime = dataTime;

                    this.detectStaleness();

                    //updates daqview url
                    let localTimestampElements: string[] = (new Date(snapshot.getUpdateTimestamp()).toString()).split(" ");

                    //keep Month, Day, Year, Time (discard Weekday and timezone info)
                    let formattedLocalTimestamp: string = localTimestampElements[3]+"-"+this.mapOfMonths[localTimestampElements[1]]+"-"+localTimestampElements[2]+"-"+localTimestampElements[4];



                    let currentUrl = document.location.href;
                    let urlToUpdate: string = currentUrl.indexOf("?") > -1 ? currentUrl.substr(0,currentUrl.indexOf("?")) : currentUrl ;
                    let query =  "setup=" + this.snapshotSource.getRequestSetup() + "&time=" + formattedLocalTimestamp;
                    urlToUpdate = urlToUpdate + "?" + query;
                    console.log("new URL : "+urlToUpdate);
                    DAQViewGUIUtility.setSharableLink(urlToUpdate);


                    //window.history.replaceState(null, null, "?setup=" + this.snapshotSource.getRequestSetup() + "&time=" + formattedLocalTimestamp);
                    document.title = "DAQView [" + formattedLocalTimestamp + "]";

                    //updates url to retrieve snapshot
                    //in case of point time queries (eg. after pause or goto-time command, the time is already appended in the URL)
                    let urlToSnapshot: string = url.indexOf("time") > -1 ? url : url + "&time=\"" + (new Date(snapshot.getUpdateTimestamp()).toISOString()) + "\"";


                    //pass info before setting snapshot and rendering (this passes the same set of info to all elements)
                    let args: string[] = [];
                    args.push(this.snapshotSource.runInfoTimelineLink());
                    this.prePassElementSpecificData(args);

                    console.log("drawPaused@provider? " + this.drawPausedPage);
                    this.setSnapshot(snapshot, this.drawPausedPage, this.drawDataFlowIsZero, this.drawStaleSnapshot);

                    //in case there is a parsed snapshot, update pointer to previous snapshot with the more precise timestamp retrieved by the snapshot itself
                    this.previousUrl = url + "&time=\"" + (new Date(snapshot.getUpdateTimestamp()).toISOString()) + "\"";

                }else{
                    console.error("DAQView was unable to parse snapshot...");
                    console.log(snapshotJSON);
                    this.setSnapshot(snapshot, this.drawPausedPage, false, false);
                }

                //reset value after use
                this.drawPausedPage = false;

                time = new Date().getTime() - startTime;
                console.log('Time to update page: ' + time + 'ms');

            }
        }

        private detectStaleness() {
            let diff: number = this.lastSnapshotRequestTime - this.lastSnapshotTime;
            let thres: number = 15000; //in ms
            console.log("Time diff between snapshot timestamp and response (in ms): "+diff);
            this.drawStaleSnapshot = diff > thres;
        }

        private snapshotFail() {
            console.error("Error in remote snapshot request, retrying.");
            let snapshot: Snapshot;
            this.setSnapshot(snapshot, this.drawPausedPage, false, false);
            //reset value after use
            this.drawPausedPage = false;
        }
    }

}