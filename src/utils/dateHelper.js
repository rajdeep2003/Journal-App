// Given a JS Date, return the UTC timestamp corresponding to
// midnight IST of that date (i.e. "today" normalized as IST start-of-day)
const getStartOfISTDay = (date = new Date()) => {
    // shift by +5:30 to read IST calendar fields off a UTC-based Date
    const istShifted = new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
    const year = istShifted.getUTCFullYear();
    const month = istShifted.getUTCMonth();
    const day = istShifted.getUTCDate();

    // midnight IST, converted back to the equivalent UTC instant
    return new Date(Date.UTC(year, month, day) - 5.5 * 60 * 60 * 1000);
};

module.exports = { getStartOfISTDay };