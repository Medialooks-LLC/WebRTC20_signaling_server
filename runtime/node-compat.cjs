'use strict';
// config 3.3.7 uses these removed Node helpers. Keep its existing behavior on Node 24.
const util = require('node:util');
if (!util.isRegExp) util.isRegExp = util.types.isRegExp;
if (!util.isDate) util.isDate = util.types.isDate;
