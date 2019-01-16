

import * as q from 'daskeyboard-applet';
import * as net from 'net';
import { forkJoin, Observable } from 'rxjs';
const logger = q.logger;

// Timeout for the TCP connection test
const TCP_TIMEOUT = 1000;

const PORT_STATUS = Object.freeze({
  OPENED: 'opened',
  CLOSED: 'closed'
});

/* Port number RegExp: [1:65535] cf. https://regex101.com/library/eI2vB7*/
const regexPortNumberInput
  = new RegExp('^(([1-9]\\d{0,3}|[1-5]\\d{4}|6[0-4]\\d{3}|65[0-4]\\d{2}|655[0-2]\\d|6553[0-5]))$');

/**
 * Class to represent the state of a PORT with the port number and the port status
 * Port status should be UP or DOWN
 */
class PortState {
  constructor(status, portNumber) {
    this.status = status;
    this.portNumber = portNumber;
  }
}
/**
 * Returns an Observable that resolves with a port state that has 
 * a an UP status if the port is opened and a DOWN status otherwise
 * @param {*} port
 * @param {*} host
 */
function getPortState(port, host) {
  logger.info(`Testing port ${port} status on host ${host}`);
  const options = {
    port: port,
    host: host
  }

  return Observable.create(observer => {
    // Destroys the TCP client and resolve the promise to false
    const onError = () => {
      client.destroy();
      observer.next(new PortState(PORT_STATUS.CLOSED, port));
      observer.complete();
    };

    // create a tcp connection, the callback
    const client = net.createConnection(options, () => {
      logger.info(`Connection establish on ${port} for host ${host}`);
      client.destroy();

      observer.next(new PortState(PORT_STATUS.OPENED, port));
      observer.complete();
    });
    // set the default timeout
    client.setTimeout(TCP_TIMEOUT);
    client.on('error', (err) => {
      console.log('error', err);
      logger.info(`Connection error on ${port} for host ${host}`);
      onError();
    });
    client.on('timeout', () => {
      logger.info(`Timeout connection on ${port} for host ${host}`);
      onError();
    });
  });
};

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
  logger.info(`isPortRangeInputValid ${firstPort} second: ${secondPort}`);
  // first port should be a number
  if (isNaN(firstPort)) {
    errors.push(`Error validating port ${firstPort} should be a number`);
    return false;
  }

  // first port should respect the regex
  if (!isPortNumberValid(firstPort)) {
    errors.push(`Error validating port ${firstPort} should be in [1:65535]`);
    return false;
  }
  // if second port defined, it should be a number too
  if (secondPort && isNaN(secondPort)) {
    errors.push(`Error validating port ${secondPort} should be a number`);
    return false;
  }

  // if second port defined, it should respect the regex
  if (secondPort && !isPortNumberValid(secondPort)) {
    errors.push(`Error validating port ${secondPort} should be in [1:65535]`);
    return false;
  }

  if (secondPort && secondPort < firstPort) {
    errors.push(`Error validating ports ${firstPort} is greater than ${secondPort}`);
    return false;
  }

  return true;
}

class FirewallGuard extends q.DesktopApp {
  constructor() {
    super();
    logger.info(`FirewallGuard ready to go!`);
    // run every 20 min
    this.pollingInterval = 1000 * 60 * 20;
  }

  // this function is called every `pollingInterval`
  async run() {
    logger.info(`FirewallGuard running`);
    if (!this.hostToMonitor || this.portsToMonitor.length === 0) {
      logger.error(`The hostname or the port are not valid`);
      return;
    }

    /* create an observable for each port to monitor and group them in one Observable array
     with forkJoin, this observable will resolve when all check port is completed */
    const checkAllPortsObservable =
      forkJoin(this.portsToMonitor.map(p => getPortState(p, this.hostToMonitor)));

    /* convert the observable to a promise and then return a signal depending on the status
    of every port*/
    return checkAllPortsObservable.toPromise().then(portStates => {
      return this.getSignalDependingOnPortStatuses(portStates);
    }).catch(err => {
      logger.error(`Error while trying to evaluate ports ${err}`)
      return q.Signal.error(`Error while trying to evaluate `
        + ` port range`);
    });
  }

  /**
   * Returns a signal depending on the open status of the port number configured
   * by the user
   * @param {*} openStatus 
   */
  getSignalDependingOnPortStatuses(portStates) {
    logger.info(`getSignalDependingOnPortStatuses`);
    // will store the result of the test of all the port range
    let areAllPortsOk = false;
    // will store the first wrong port
    let firstWrongPort;
    // message if error
    let messageIfError;
    switch (this.config.portStatus) {
      case PORT_STATUS.OPENED:
        logger.info(`All ports should be up`);
        // evey ports should have status UP
        areAllPortsOk = portStates.every(ps => ps.status === PORT_STATUS.OPENED);
        if (!areAllPortsOk) {
          firstWrongPort = portStates.find(ps => ps.status !== PORT_STATUS.OPENED);
          messageIfError = `closed (should be opened)`;
        }
        break;
      case PORT_STATUS.CLOSED:
        logger.info(`All ports should be down`);
        // all ports should have status DOWN
        areAllPortsOk = portStates.every(ps => ps.status === PORT_STATUS.CLOSED);
        if (!areAllPortsOk) {
          firstWrongPort = portStates.find(ps => ps.status !== PORT_STATUS.CLOSED);
          messageIfError = `opened (should be closed)`;
        }
        break;
    }

    if (!areAllPortsOk) {
      const message = `${this.hostToMonitor}:${this.portsToMonitor[0]}-`
        + `${this.portsToMonitor[this.portsToMonitor - 1]}`
        + ` ${this.config.portStatus}`;

      logger.info(`Some ports are in the wrong state.` +
        `First wrong port ${JSON.stringify(firstWrongPort)}`)
      return new q.Signal({
        points: [[new q.Point('#FF0000', q.Effects.BLINK)]],
        name: 'Firewall Guard',
        message: message,
        isMuted: false
      });
    } else {
      const message = `${this.hostToMonitor}:${firstWrongPort.portNumber}`
        + ` error ${messageIfError}`;
      logger.info(`All port in range are in good state`);
      return new q.Signal({
        points: [[new q.Point('#00FF00')]],
        name: 'Firewall Guard',
        message: message
      });
    }
  }

  /**
   * Called when user change the input questions defined in the package.json
   */
  async applyConfig() {
    if (!this.config.host || !this.config.portRange || !this.config.portStatus) {
      return;
    }

    // process the hostname
    if (this.config.host) {
      this.hostToMonitor = this.config.host.trim().toLowerCase();
    }

    /* process the port*/
    let ports = this.config.portRange.split('-');
    // extract the first and second 
    let firstPort = ports[0];
    let secondPort = ports[1];

    /* Throw an error if the portRange is not valid */
    const errorMessage = [];
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
      const length = secondPort - firstPort + 1;
      const range = new Array(length);
      for (let i = 0; i < length; i++) {
        range[i] = firstPort + i;
      }
      this.portsToMonitor = range;
    } else {
      this.portsToMonitor = [];
      this.portsToMonitor.push(firstPort);
    }
  }
}


module.exports = {
  FirewallGuard: FirewallGuard,
  getPortState: getPortState,
  isPortNumberValid: isPortNumberValid,
  isPortRangeInputValid: isPortRangeInputValid,
  PortState: PortState,
  PORT_STATUS: PORT_STATUS
}

const firewallGuard = new FirewallGuard();

