define([], function () {

    if (!Array.prototype.map) {
        Array.prototype.map = function (callback /*, thisObject*/) {
            var self = this;
            var length = self.length >>> 0;
            var result = Array(length);
            var thisObject = arguments[1];

            if (typeof callback != "function") {
                throw new TypeError(callback + " is not a function");
            };

            for (var i = 0; i < length; i++) {
                if (i in self) {
                    result[i] = callback.call(thisObject, self[i], i, self);
                };
            };

            return result;
        };
    };

    if (!Array.prototype.some) {
        Array.prototype.some = function (callback /*, thisObject*/) {
            var self = this;
            var length = self.length >>> 0;
            var thisObject = arguments[1];

            if (typeof callback != "function") {
                throw new TypeError(callback + " is not a function");
            };

            for (var i = 0; i < length; i++) {
                if (callback.call(thisObject, self[i], i, self)) {
                    return true;
                };
            };

            return false;
        };
    };

    if (!Array.prototype.every) {
        Array.prototype.every = function (callback /*, thisObject*/) {
            var self = this;
            var length = self.length >>> 0;
            var thisObject = arguments[1];

            if (typeof callback != "function") {
                throw new TypeError(callback + " is not a function");
            };

            for (var i = 0; i < length; i++) {
                if (!callback.call(thisObject, self[i], i, self)) {
                    return false;
                };
            };

            return true;
        };
    };

    if (!Array.prototype.findIndex) {
        Array.prototype.findIndex = function (callback /*, thisObject*/) {
            var self = this;
            var length = self.length >>> 0;
            var thisObject = arguments[1];

            if (typeof callback != "function") {
                throw new TypeError(callback + " is not a function");
            };

            for (var i = 0; i < length; i++) {
                if (callback.call(thisObject, self[i], i, self)) {
                    return i;
                };
            };

            return -1;
        };
    };

    if (!Array.prototype.find) {
        Array.prototype.find = function (callback /*, thisObject*/) {
            var self = this;
            var length = self.length >>> 0;
            var thisObject = arguments[1];

            if (typeof callback != "function") {
                throw new TypeError(callback + " is not a function");
            };

            for (var i = 0; i < length; i++) {
                if (callback.call(thisObject, self[i], i, self)) {
                    return self[i];
                };
            };

            return null;
        };
    };

    if (!Array.prototype.move) {
        Array.prototype.move = function (fromIndex, toIndex) {
            if (!(typeof fromIndex == 'number')) {
                throw new TypeError('Array.move parameter "fromIndex" must be a number');
            };
            if (!(typeof toIndex == 'number')) {
                throw new TypeError('Array.move parameter "toIndex" must be a number');
            };
            var length = this.length >>> 0;
            if (fromIndex < 0 || fromIndex >= length) {
                return this;
            };
            if (fromIndex == toIndex) {
                return this;
            };
            var item = this[fromIndex];
            this.splice(fromIndex, 1);
            if (toIndex < 0 || toIndex >= length) {
                this.push(item);
            }
            else {
                this.splice(toIndex, 0, item);
            }
        };
    };
});