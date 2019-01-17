"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var q = require("daskeyboard-applet");
var net = require("net");
var rxjs_1 = require("rxjs");
var logger = q.logger;
// Timeout for the TCP connection test
var TCP_TIMEOUT = 1000;
var PORT_STATUS = Object.freeze({
    OPENED: 'opened',
    CLOSED: 'closed'
});
/* Port number RegExp: [1:65535] cf. https://regex101.com/library/eI2vB7*/
var regexPortNumberInput = new RegExp('^(([1-9]\\d{0,3}|[1-5]\\d{4}|6[0-4]\\d{3}|65[0-4]\\d{2}|655[0-2]\\d|6553[0-5]))$');
/**
 * Class to represent the state of a PORT with the port number and the port status
 * Port status should be UP or DOWN
 */
var PortState = /** @class */ (function () {
    function PortState(status, portNumber) {
        this.status = status;
        this.portNumber = portNumber;
    }
    return PortState;
}());
/**
 * Returns an Observable that resolves with a port state that has
 * a an UP status if the port is opened and a DOWN status otherwise
 * @param {*} port
 * @param {*} host
 */
function getPortState(port, host) {
    logger.info("Testing port " + port + " status on host " + host);
    var options = {
        port: port,
        host: host
    };
    return rxjs_1.Observable.create(function (observer) {
        // Destroys the TCP client and resolve the promise to false
        var onError = function () {
            client.destroy();
            observer.next(new PortState(PORT_STATUS.CLOSED, port));
            observer.complete();
        };
        // create a tcp connection, the callback
        var client = net.createConnection(options, function () {
            logger.info("Connection establish on " + port + " for host " + host);
            client.destroy();
            observer.next(new PortState(PORT_STATUS.OPENED, port));
            observer.complete();
        });
        // set the default timeout
        client.setTimeout(TCP_TIMEOUT);
        client.on('error', function (err) {
            console.log('error', err);
            logger.info("Connection error on " + port + " for host " + host);
            onError();
        });
        client.on('timeout', function () {
            logger.info("Timeout connection on " + port + " for host " + host);
            onError();
        });
    });
}
;
/**
 * Tests the validity of a port number given in param is between 1 and 65535
 * @param {*} portNumber
 */
function isPortNumberValid(portNumber) {
    return regexPortNumberInput.test(portNumber);
}
/**
 * Returns true if the 2 ports are valid
 * False otherwise and populate the errors array with the appropriate message
 * The format should be P1-P2 with P1 and P2 numbers and P1 < P2
 * both ports should also be valid
 * @param {*} firstPort type string
 * @param {*} secondPort type string
 * @param {*} errors pointer to an array where to store the errors
 */
function isPortRangeInputValid(firstPort, secondPort, errors) {
    logger.info("isPortRangeInputValid " + firstPort + " second: " + secondPort);
    // first port should be a number
    if (isNaN(firstPort)) {
        errors.push("Error validating port " + firstPort + " should be a number");
        return false;
    }
    // first port should respect the regex
    if (!isPortNumberValid(firstPort)) {
        errors.push("Error validating port " + firstPort + " should be in [1:65535]");
        return false;
    }
    // if second port defined, it should be a number too
    if (secondPort && isNaN(secondPort)) {
        errors.push("Error validating port " + secondPort + " should be a number");
        return false;
    }
    // if second port defined, it should respect the regex
    if (secondPort && !isPortNumberValid(secondPort)) {
        errors.push("Error validating port " + secondPort + " should be in [1:65535]");
        return false;
    }
    if (secondPort && secondPort < firstPort) {
        errors.push("Error validating ports " + firstPort + " is greater than " + secondPort);
        return false;
    }
    return true;
}
var FirewallGuard = /** @class */ (function (_super) {
    __extends(FirewallGuard, _super);
    function FirewallGuard() {
        var _this = _super.call(this) || this;
        logger.info("FirewallGuard ready to go!");
        // run every 20 min
        _super.prototype.pollingInterval = 1000 * 60 * 20;
        return _this;
    }
    // this function is called every `pollingInterval`
    FirewallGuard.prototype.run = function () {
        return __awaiter(this, void 0, void 0, function () {
            var checkAllPortsObservable;
            var _this = this;
            return __generator(this, function (_a) {
                logger.info("FirewallGuard running");
                if (!this.hostToMonitor || this.portsToMonitor.length === 0) {
                    logger.error("The hostname or the port are not valid");
                    return [2 /*return*/];
                }
                checkAllPortsObservable = rxjs_1.forkJoin(this.portsToMonitor.map(function (p) { return getPortState(p, _this.hostToMonitor); }));
                /* convert the observable to a promise and then return a signal depending on the status
                of every port*/
                return [2 /*return*/, checkAllPortsObservable.toPromise().then(function (portStates) {
                        return _this.getSignalDependingOnPortStatuses(portStates);
                    }).catch(function (err) {
                        logger.error("Error while trying to evaluate ports " + err);
                        return q.Signal.error("Error while trying to evaluate "
                            + " port range");
                    })];
            });
        });
    };
    /**
     * Returns a signal depending on the open status of the port number configured
     * by the user
     * @param {*} openStatus
     */
    FirewallGuard.prototype.getSignalDependingOnPortStatuses = function (portStates) {
        logger.info("getSignalDependingOnPortStatuses");
        // will store the result of the test of all the port range
        var areAllPortsOk = false;
        // will store the first wrong port
        var firstWrongPort;
        // message if error
        var messageIfError;
        switch (_super.prototype.config.portStatus) {
            case PORT_STATUS.OPENED:
                logger.info("All ports should be up");
                // evey ports should have status UP
                areAllPortsOk = portStates.every(function (ps) { return ps.status === PORT_STATUS.OPENED; });
                if (!areAllPortsOk) {
                    firstWrongPort = portStates.find(function (ps) { return ps.status !== PORT_STATUS.OPENED; });
                    messageIfError = "closed (should be opened)";
                }
                break;
            case PORT_STATUS.CLOSED:
                logger.info("All ports should be down");
                // all ports should have status DOWN
                areAllPortsOk = portStates.every(function (ps) { return ps.status === PORT_STATUS.CLOSED; });
                if (!areAllPortsOk) {
                    firstWrongPort = portStates.find(function (ps) { return ps.status !== PORT_STATUS.CLOSED; });
                    messageIfError = "opened (should be closed)";
                }
                break;
        }
        if (!areAllPortsOk) {
            var message = this.hostToMonitor + ":" + this.portsToMonitor[0] + "-"
                + ("" + this.portsToMonitor[this.portsToMonitor.length - 1])
                + (" " + _super.prototype.config.portStatus);
            logger.info("Some ports are in the wrong state." +
                ("First wrong port " + JSON.stringify(firstWrongPort)));
            return new q.Signal({
                points: [[new q.Point('#FF0000', q.Effects.BLINK)]],
                name: 'Firewall Guard',
                message: message,
                isMuted: false
            });
        }
        else {
            var message = this.hostToMonitor + ":" + firstWrongPort.portNumber
                + (" error " + messageIfError);
            logger.info("All port in range are in good state");
            return new q.Signal({
                points: [[new q.Point('#00FF00')]],
                name: 'Firewall Guard',
                message: message
            });
        }
    };
    /**
     * Called when user change the input questions defined in the package.json
     */
    FirewallGuard.prototype.applyConfig = function () {
        return __awaiter(this, void 0, void 0, function () {
            var ports, firstPort, secondPort, errorMessage, length, range, i;
            return __generator(this, function (_a) {
                if (!_super.prototype.config.host || !_super.prototype.config.portRange || !_super.prototype.config.portStatus) {
                    return [2 /*return*/];
                }
                // process the hostname
                if (_super.prototype.config.host) {
                    this.hostToMonitor = _super.prototype.config.host.trim().toLowerCase();
                }
                ports = _super.prototype.config.portRange.split('-');
                firstPort = ports[0];
                secondPort = ports[1];
                errorMessage = [];
                if (!isPortRangeInputValid(firstPort, secondPort, errorMessage)) {
                    throw new Error(errorMessage.join(','));
                }
                // convert ports to numbers
                firstPort = +firstPort;
                secondPort = +secondPort;
                /** If a second port is defined, the array of monitors is a range between the first
                 * port to the second port. Otherwise it's just the first port
                 */
                if (secondPort) {
                    length = secondPort - firstPort + 1;
                    range = new Array(length);
                    for (i = 0; i < length; i++) {
                        range[i] = firstPort + i;
                    }
                    this.portsToMonitor = range;
                }
                else {
                    this.portsToMonitor = [];
                    this.portsToMonitor.push(firstPort);
                }
                return [2 /*return*/];
            });
        });
    };
    return FirewallGuard;
}(q.DesktopApp));
module.exports = {
    FirewallGuard: FirewallGuard,
    getPortState: getPortState,
    isPortNumberValid: isPortNumberValid,
    isPortRangeInputValid: isPortRangeInputValid,
    PortState: PortState,
    PORT_STATUS: PORT_STATUS
};
var firewallGuard = new FirewallGuard();
