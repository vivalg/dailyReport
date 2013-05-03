// Generated by CoffeeScript 1.6.1
(function() {
  var Response, getDateNumber, getDepartTreeData, parseDepartments, parseUsers, redis, userModel;

  redis = require("redis");

  Response = require('../vo/response').Response;

  userModel = require('./usersModel');

  exports.createReport = function(userId, content, dateStr, callback) {
    var client;
    client = redis.createClient();
    userId = "28";
    return client.incr("next_report_id", function(err, reportId) {
      var score;
      score = getDateNumber(dateStr);
      return client.zadd("userid:" + userId + ":reportIds", score, reportId, function(err, reply) {
        return client.hmset("userid:" + userId + ":reports", "" + reportId + ":date", dateStr, "" + reportId + ":content", content, function(err, reply) {
          return callback(new Response(1, 'success', reply));
        });
      });
    });
  };

  getDateNumber = function(dateStr) {
    var date, months, year, _ref;
    _ref = dateStr.split("-"), year = _ref[0], months = _ref[1], date = _ref[2];
    if (months.length === 1) {
      months = "0" + months;
    }
    if (date.length === 1) {
      date = "0" + date;
    }
    return parseInt("" + year + months + date);
  };

  exports.getReports = function(userId, page, numOfPage, callback) {
    var client, end, start;
    client = redis.createClient();
    start = numOfPage * (page - 1);
    if (start < 0) {
      start = 0;
    }
    end = (numOfPage * page) - 1;
    return client.zrevrange("userid:" + userId + ":reportIds", start, end, function(err, reportIds) {
      var contentArgs, dateArgs, reportId, _i, _len;
      console.log("reportIds:" + reportIds);
      if (reportIds && reportIds.length === 0) {
        return callback(new Response(1, 'success', []));
      }
      dateArgs = ["userid:" + userId + ":reports"];
      contentArgs = ["userid:" + userId + ":reports"];
      for (_i = 0, _len = reportIds.length; _i < _len; _i++) {
        reportId = reportIds[_i];
        dateArgs.push("" + reportId + ":date");
        contentArgs.push("" + reportId + ":content");
      }
      return client.hmget(dateArgs, function(err, dates) {
        return client.hmget(contentArgs, function(err, contents) {
          var i, len, response, _j;
          len = contents.length;
          response = [];
          for (i = _j = 0; 0 <= len ? _j < len : _j > len; i = 0 <= len ? ++_j : --_j) {
            response.push({
              id: reportIds[i],
              date: dates[i],
              content: contents[i]
            });
          }
          client.quit();
          return callback(new Response(1, 'success', response));
        });
      });
    });
  };

  exports.getReportNum = function(userId, callback) {
    var client;
    client = redis.createClient();
    return client.zcount("userid:" + userId + ":reportIds", "-inf", "+inf", function(err, count) {
      client.quit();
      console.log(count);
      return callback(new Response(1, 'success', count));
    });
  };

  exports.deleteReport = function(userId, reportId, callback) {
    var client;
    client = redis.createClient();
    return client.zrem("userid:" + userId + ":reportIds", reportId, function(err, reply) {
      return client.hdel("userid:" + userId + ":reports", "" + reportId + ":date", "" + reportId + ":content", function(err, reply) {}, client.quit(), callback(new Response(1, 'success', reply)));
    });
  };

  exports.getSubordinateUserAndDepartment = function(userId, callback) {
    var client;
    client = redis.createClient();
    return client.hgetall("users", function(err, users) {
      var children, getSubordinateIds, subordinateIds, subordinateUsers, user, userArray, userObjs, userTree, _i, _j, _len, _len1, _ref;
      _ref = parseUsers(users), userObjs = _ref[0], userArray = _ref[1];
      userTree = getDepartTreeData(userArray, {});
      subordinateIds = [];
      children = [];
      for (_i = 0, _len = userTree.length; _i < _len; _i++) {
        user = userTree[_i];
        if (user["id"] === userId) {
          children = user["children"];
          break;
        }
      }
      getSubordinateIds = function(children, subordinateIds) {
        var _j, _len1, _results;
        _results = [];
        for (_j = 0, _len1 = children.length; _j < _len1; _j++) {
          user = children[_j];
          subordinateIds.push(user["id"]);
          if (user["children"]) {
            _results.push(getSubordinateIds(user["children"], subordinateIds));
          } else {
            _results.push(void 0);
          }
        }
        return _results;
      };
      getSubordinateIds(children, subordinateIds);
      subordinateUsers = [];
      for (_j = 0, _len1 = subordinateIds.length; _j < _len1; _j++) {
        userId = subordinateIds[_j];
        subordinateUsers.push(userObjs[userId]);
      }
      return client.hgetall("departments", function(err, departments) {
        var department, departmentId, departmentObjs, departmentTree, getUserDepartmentTreeData, subordinateDepartmentObjs, subordinateDepartments, _, _k, _len2, _ref1;
        _ref1 = parseDepartments(departments), departmentObjs = _ref1[0], _ = _ref1[1];
        subordinateDepartmentObjs = {};
        for (_k = 0, _len2 = subordinateUsers.length; _k < _len2; _k++) {
          user = subordinateUsers[_k];
          departmentId = user["departmentId"];
          subordinateDepartmentObjs[departmentId] = departmentObjs[departmentId];
        }
        subordinateDepartments = [];
        for (_ in subordinateDepartmentObjs) {
          department = subordinateDepartmentObjs[_];
          subordinateDepartments.push(department);
        }
        departmentTree = getDepartTreeData(subordinateDepartments, subordinateDepartmentObjs);
        getUserDepartmentTreeData = function(departmentTree) {
          var _l, _len3, _len4, _m, _ref2, _results;
          _results = [];
          for (_l = 0, _len3 = departmentTree.length; _l < _len3; _l++) {
            department = departmentTree[_l];
            if (!department["node"]) {
              continue;
            }
            departmentId = department["id"];
            if ((_ref2 = department["children"]) == null) {
              department["children"] = [];
            }
            for (_m = 0, _len4 = subordinateUsers.length; _m < _len4; _m++) {
              user = subordinateUsers[_m];
              if (user["departmentId"] !== departmentId) {
                continue;
              }
              department["children"].push({
                id: user["id"],
                label: user["name"]
              });
            }
            if (department["children"]) {
              _results.push(getUserDepartmentTreeData(department["children"]));
            } else {
              _results.push(void 0);
            }
          }
          return _results;
        };
        getUserDepartmentTreeData(departmentTree);
        client.quit();
        return callback(new Response(1, 'success', departmentTree));
      });
    });
  };

  parseUsers = function(data) {
    var childOfKey, key, key2, result, resultObj, userId, value, value2, _ref;
    resultObj = {};
    for (key in data) {
      value = data[key];
      childOfKey = key.split(":");
      userId = childOfKey[0];
      if ((_ref = resultObj[userId]) == null) {
        resultObj[userId] = {
          id: userId
        };
      }
      if (childOfKey[1] === "user_name") {
        resultObj[userId]["name"] = value;
      } else if (childOfKey[1] === "department_id") {
        resultObj[userId]["departmentId"] = value;
      } else if (childOfKey[1] === "superior_id") {
        resultObj[userId]["pid"] = value;
      }
    }
    result = [];
    for (key2 in resultObj) {
      value2 = resultObj[key2];
      result.push(value2);
    }
    return [resultObj, result];
  };

  parseDepartments = function(data) {
    var childOfKey, departmentId, key, key2, result, resultObj, value, value2, _ref;
    resultObj = {};
    for (key in data) {
      value = data[key];
      childOfKey = key.split(":");
      departmentId = childOfKey[0];
      if ((_ref = resultObj[departmentId]) == null) {
        resultObj[departmentId] = {
          id: departmentId
        };
      }
      if (childOfKey[1] === "name") {
        resultObj[departmentId]["name"] = value;
      } else if (childOfKey[1] === "pid") {
        resultObj[departmentId]["pid"] = value;
      }
    }
    result = [];
    for (key2 in resultObj) {
      value2 = resultObj[key2];
      result.push(value2);
    }
    return [resultObj, result];
  };

  getDepartTreeData = function(departs, allObjs) {
    var findChidren, node, rootnode, treeData, value, _i, _j, _len, _len1;
    treeData = [];
    for (_i = 0, _len = departs.length; _i < _len; _i++) {
      value = departs[_i];
      rootnode = {
        label: value.name,
        id: value.id,
        node: 1
      };
      if (!(value.pid && allObjs[value.pid])) {
        treeData.push(rootnode);
      }
    }
    findChidren = function(node, departs) {
      var childNode, _j, _len1, _results;
      _results = [];
      for (_j = 0, _len1 = departs.length; _j < _len1; _j++) {
        value = departs[_j];
        if (value.pid === node.id) {
          if (!node.children) {
            node.children = [];
          }
          childNode = {
            label: value.name,
            id: value.id,
            node: 1
          };
          node.children.push(childNode);
          _results.push(findChidren(childNode, departs));
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    };
    for (_j = 0, _len1 = treeData.length; _j < _len1; _j++) {
      node = treeData[_j];
      findChidren(node, departs);
    }
    return treeData;
  };

}).call(this);
