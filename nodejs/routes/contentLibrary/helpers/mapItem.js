module.exports = function(item) {
    var returnItem = {
        id: item.id,
        text: item.Name,
        type: item.TypeName,
        parentId: item.ParentId,
        attributes: item.Attributes
    };

    if (item.SubCount > 0) {
        returnItem.subs = "+";
    }

    return returnItem;
};