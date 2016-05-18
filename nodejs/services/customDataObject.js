function customDataObject(baseData) {
    this._CustomData = {};

    if (baseData) {
        for (var key in baseData) {
            if (baseData.hasOwnProperty(key)) {
                this[key] = baseData[key];
            }
        }
    }
}

customDataObject.prototype.GetProperties = function() {
    return this._CustomData;
};

customDataObject.prototype.SetProperty = function(propertyName, propertyValue) {
    if (propertyValue == null) {
        delete this._CustomData[propertyName];
    }

    else {
        this._CustomData[propertyName] = propertyValue;
    }
};

module.exports = customDataObject;