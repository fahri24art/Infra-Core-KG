const snmp = require('net-snmp');

const getOids = (session, oidList) => {
  return new Promise((resolve, reject) => {
    session.get(oidList, (err, varbinds) => {
      if (err) return reject(err);
      resolve(varbinds);
    });
  });
};

const pollDevice = async (ip) => {
  const session = snmp.createSession(ip, "public");
  const results = {
    model: null,
    serial: null,
    tonerBlack: null,
    tonerCyan: null,
    tonerMagenta: null,
    tonerYellow: null,
    counterTotal: null,
    counterBW: null,
    counterColor: null
  };

  try {
    // 1. Base / Common OIDs (Model, Serial, Total, BW, Black Toner)
    const baseOids = [
      "1.3.6.1.2.1.25.3.2.1.3.1",        // model
      "1.3.6.1.2.1.43.5.1.1.17.1",        // serial
      "1.3.6.1.4.1.367.3.2.1.2.19.1.0",   // counterTotal
      "1.3.6.1.4.1.367.3.2.1.2.19.2.0",   // counterBW
      "1.3.6.1.2.1.43.11.1.1.9.1.1"       // tonerBlack
    ];
    const baseVbs = await getOids(session, baseOids);
    results.model = baseVbs[0].value ? baseVbs[0].value.toString() : null;
    results.serial = baseVbs[1].value ? baseVbs[1].value.toString() : null;
    results.counterTotal = baseVbs[2].value ? baseVbs[2].value.toString() : null;
    results.counterBW = baseVbs[3].value ? baseVbs[3].value.toString() : null;
    results.tonerBlack = baseVbs[4].value ? baseVbs[4].value.toString() : null;

    // 2. Color OIDs (Optional for Color Printers like IM C2000)
    try {
      const colorOids = [
        "1.3.6.1.2.1.43.11.1.1.9.1.2",     // tonerCyan
        "1.3.6.1.2.1.43.11.1.1.9.1.3",     // tonerMagenta
        "1.3.6.1.2.1.43.11.1.1.9.1.4",     // tonerYellow
        "1.3.6.1.4.1.367.3.2.1.2.19.4.0"   // counterColor
      ];
      const colorVbs = await getOids(session, colorOids);
      results.tonerCyan = colorVbs[0].value ? colorVbs[0].value.toString() : null;
      results.tonerMagenta = colorVbs[1].value ? colorVbs[1].value.toString() : null;
      results.tonerYellow = colorVbs[2].value ? colorVbs[2].value.toString() : null;
      results.counterColor = colorVbs[3].value ? colorVbs[3].value.toString() : null;
    } catch (e) {
      // Monochrome printer doesn't have color OIDs, perfectly normal
    }
  } finally {
    session.close();
  }

  return results;
};

const calculateDelta = (currentStats, previousStats) => {
  const delta = {
    bw: parseInt(currentStats.counterBW || 0) - parseInt(previousStats.counterBW || 0),
    color: parseInt(currentStats.counterColor || 0) - parseInt(previousStats.counterColor || 0),
    total: parseInt(currentStats.counterTotal || 0) - parseInt(previousStats.counterTotal || 0)
  };
  return delta;
};

module.exports = {
  pollDevice,
  calculateDelta
};
