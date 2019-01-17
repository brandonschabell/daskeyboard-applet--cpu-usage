const assert = require('assert');
const t = require('../index');
const net = require('net');
const { Observable } = require('rxjs');
const q = require('daskeyboard-applet');


/**
 * Return an Observable that will resolve if port opens and error if timeout or error
 * @param {*} portNumber 
 */
function openPort(portNumber) {
  return Observable.create(observer => {
    const onError = (err) => {
      server.close();
      observer.error(err);
      observer.complete();
    };
    const server = net.createServer((c) => {
      // 'connection' listener
      c.on('end', () => {
      });
      server.close();
    });
    server.on('error', (err) => {
      onError(`${err}`);
    });
    server.listen(portNumber, () => {
      observer.next();
      observer.complete();
    });
  });

}

describe('#getPortState', () => {
  it('should resolve with a PortState containing the same port number as given in params',
    async function () {
      return openPort(27310).toPromise().then(() => {
        return t.getPortState(27310, 'localhost').subscribe(portState => {
          assert.equal(portState.portNumber, 27310);
        }, (err) => assert.fail(err));
      });
    });

  it('should resolve with an OPENED port status if port opened', async function () {
    return openPort(27310).toPromise().then(() => {
      return t.getPortState(27310, 'localhost').subscribe(portState => {
        assert.equal(portState.status, t.PORT_STATUS.OPENED);
      }, (err) => assert.fail(err));
    });
  });

  it('should resolve with an CLOSED port status if port closed',
    async function () {
      return t.getPortState(44, 'localhost').subscribe(portState => {
        assert.equal(portState.status, t.PORT_STATUS.CLOSED);
      }, (err) => {
        assert.fail(err);
      });
    });
});

describe('#isPortNumberValid', () => {
  it('8080 should be a valid port number', function () {
    assert.ok(t.isPortNumberValid(8080))
  });
  it('69000 should not be a valid port number', function () {
    assert.ok(!t.isPortNumberValid(69000))
  });
});

describe('#isPortRangeInputValid', () => {
  it('should accept 2 valid ports', function () {
    const errors = [];
    const test = t.isPortRangeInputValid(8080, 60000, errors);
    assert.ok(test);
    assert.equal(errors.length, 0);
  });

  it('should error if first port is not a number', function () {
    const errorMessage = [];
    const test = t.isPortRangeInputValid('dummyPort', undefined, errorMessage);
    assert.ok(!test);
  });

  it('should error if second port is not a number', function () {
    const errorMessage = [];
    const test = t.isPortRangeInputValid('8070', 'dummyPort', errorMessage);
    assert.ok(!test);
  });

  it('should error if second port smaller than first port', function () {
    const errorMessage = [];
    const test = t.isPortRangeInputValid('8080', '10', errorMessage);
    assert.ok(!test);
  });
});

describe('#run', () => {
  it('should blink red if guarding closed port and actually opened', async function () {
    const config = {
      applet: {
        user: {
          host: 'localhost',
          portRange: '27301-27302', // Das Keyboard Q app opens this 2 ports
          portStatus: 'closed'
        }
      }
    }
    return buildAppWithConfig(config).then(app => {
      return app.run().then(signal => {
        assert.equal(signal.points[0][0].color, '#FF0000');
        assert.equal(signal.points[0][0].effect, q.Effects.BLINK);
      });
    });
  });

  it('should set green color if guarding opened port and actually opened', async function () {
    const config = {
      applet: {
        user: {
          host: 'localhost',
          portRange: '27301-27302', // Das Keyboard Q app opens this 2 ports
          portStatus: 'opened'
        }
      }
    }
    return buildAppWithConfig(config).then(app => {
      return app.run().then(signal => {
        assert.equal(signal.points[0][0].color, '#00FF00');
        assert.equal(signal.points[0][0].effect, q.Effects.SET_COLOR);
      });
    });
  });
})

/**
 * Builds the app with the config given in param
 * @param {*} config 
 */
function buildAppWithConfig(config) {
  const app = new t.FirewallGuard();
  return app.processConfig(config).then(() => {
    return app;
  });
}

