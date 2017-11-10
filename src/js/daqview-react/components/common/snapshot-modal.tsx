/**
 * Created by mvougiou on 1/11/17.
 */

/**
 * @author Michail Vougioukas
 * @author Philipp Brummer
 */

namespace DAQView {

    import DAQAggregatorSnapshot = DAQAggregator.Snapshot;

    export class SnapshotModal implements DAQView.DAQSnapshotView {
        public htmlRootElement: Element;
        private configuration: DAQViewConfiguration;

        private snapshot: DAQAggregatorSnapshot;
        private drawPausedComponent: boolean = false;
        private url: string = "";

        constructor(htmlRootElementName: string, configuration: DAQViewConfiguration) {
            this.htmlRootElement = document.getElementById(htmlRootElementName);
            this.configuration = configuration;
        }

        public setSnapshot(snapshot: DAQAggregatorSnapshot, drawPausedComponent: boolean, drawZeroDataFlowComponent:boolean, drawStaleSnapshot:boolean) {
            this.snapshot = snapshot;
            this.drawPausedComponent = drawPausedComponent;

            if (!snapshot) {
                let msg: string = "";
                let errRootElement: any = <ErrorElement message={msg}/>;
                ReactDOM.render(errRootElement, this.htmlRootElement);
            } else {
                let daq: DAQAggregatorSnapshot.DAQ = snapshot.getDAQ();
                this.url = this.configuration.snapshotSource.url + "?setup=" + this.configuration.setupName + "&time=\"" + new Date(snapshot.getUpdateTimestamp()).toISOString() + "\"";

                let snapshotModalRootElement: any = <SnapshotModalElement daq={daq} url={this.url}/>;
                ReactDOM.render(snapshotModalRootElement, this.htmlRootElement);
            }
        }

        //to be called before setSnapshot
        public prePassElementSpecificData(args: string []){

        }
    }

    interface SnapshotModalElementProperties {
        daq: DAQAggregatorSnapshot.DAQ;
        url: string;
    }

    class SnapshotModalElement extends React.Component<SnapshotModalElementProperties,{}> {
        render() {
            return (
                <div>
                    <button className="button-share">Share</button>
                    <a href={this.props.url} target="_blank"><button className="button-snapshot">See raw DAQ snapshot</button></a>
                </div>);
        }
    }

    interface ErrorElementProperties {
        message: string;
    }

    class ErrorElement extends React.Component<ErrorElementProperties,{}> {
        render() {
            return (
                <div>{this.props.message}</div>
            );
        }
    }


}