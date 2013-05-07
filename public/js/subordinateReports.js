// Generated by CoffeeScript 1.6.1
(function() {
  var treeList;

  treeList = new TreeList2("#userTree");

  ReportModel.getSubordinateUserAndDepartment("28", function(response) {
    var treeData;
    treeData = response.data;
    return treeList.renderTree("#userTree", treeData);
  });

  $("#userTree").on("review", function(event) {
    var userId;
    userId = event["itemId"];
    getReports(userId);
    return getReportNum(userId);
  });

}).call(this);