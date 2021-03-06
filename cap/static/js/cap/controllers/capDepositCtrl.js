/* -*- coding: utf-8 -*-
 *
 * This file is part of CERN Analysis Preservation Framework.
 * Copyright (C) 2016 CERN.
 *
 * CERN Analysis Preservation Framework is free software; you can redistribute
 * it and/or modify it under the terms of the GNU General Public License as
 * published by the Free Software Foundation; either version 2 of the
 * License, or (at your option) any later version.
 *
 * CERN Analysis Preservation Framework is distributed in the hope that it will
 * be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with CERN Analysis Preservation Framework; if not, write to the
 * Free Software Foundation, Inc., 59 Temple Place, Suite 330, Boston,
 * MA 02111-1307, USA.
 *
 * In applying this license, CERN does not
 * waive the privileges and immunities granted to it by virtue of its status
 * as an Intergovernmental Organization or submit itself to any jurisdiction.
 */

///////////////////////////////////////////
///////////////////////////////////////////
// CAP app Deposit Controller

var capDepositCtrl = function($scope, $location, $http, deposit, contentBarTabs) {
  $scope.deposit = deposit;
  $scope.pid_value = deposit.id;
  $scope.contentBarTabs = contentBarTabs;
  $scope.mi = deposit.meta_info;

  $scope.initDeposit = function() {
    $scope.progress = {};
    $scope.type = {};
    $scope.req = {};
    $scope.current_key = '';
    $scope.depositionForm = {};
  };

  $scope.$on('sf-render-finished', function(event){
    watchAndUpdate({}, {});

    $scope.$watch('depositionForm.$error', function(newValue, oldValue) {
      watchAndUpdate(newValue, oldValue);
    }, 'true');
  });

  var watchAndUpdate =  function(newValue, oldValue) {
    if (newValue && oldValue) {

      if ($scope.recordsVM && $scope.recordsVM.invenioRecordsSchema) {

        var props = $scope.recordsVM.invenioRecordsSchema.properties;
        angular.forEach(props, function(value, key) {
          if (key.indexOf("_") !== 0) {
            $scope.progress[key] = 0;
            $scope.type[key] = '';
            if (value.name !== "_deposit" && value.required !== undefined) {
              $scope.req[key] = value.required;
            }
          }
        });
      }

      angular.forEach($scope.progress, function(value, key){
        if (!(key in $scope.req)){
          $scope.progress[key] = 'N/A';
          $scope.type[key] = 'disabled';
        }
      });

      // Calculate percentage for every element
      if (oldValue !== newValue) {
        angular.forEach($scope.depositionForm, function(value, key) {
          if ((key.indexOf('$') !== 0) && value.$dirty) {
            angular.forEach($scope.req, function(v, k) {
              if (v.indexOf(key) > -1) {
                current_key = k;
              }
            });
            if ($scope.req[current_key].indexOf(key) > -1) {
              calculatePercentage($scope.req, current_key, value);
            }
          }
        });
      }

      if ($scope.depositionForm && $scope.depositionForm.$valid) {
        angular.forEach($scope.req, function(value, key) {
          $scope.progress[key] = 100;
          $scope.type[key] = 'success';
        });
      }

      function calculatePercentage(req, current_key, value) {
        if ($scope.req[current_key].length == 1) {
          if (value.$invalid) {
            $scope.progress[current_key] = 0;
            $scope.type[current_key] = '';
          } else {
            $scope.progress[current_key] = 100;
            $scope.type[current_key] = 'success';
          }
        } else {
          if (value.$valid) {
            $scope.progress[current_key] += parseInt(100 / req[current_key].length);
            if ($scope.progress[current_key] >= 98 && $scope.progress[current_key] <= 102) {
              $scope.progress[current_key] = 100;
            }
          }
          if ($scope.progress[current_key] == 100) {
            $scope.type[current_key] = 'success';
          } else if ($scope.progress[current_key] > 0) {
            $scope.type[current_key] = 'warning';
          }
        }
      };
    }
  };



  // Handle Deposit Permissions //
  ////////////////////////////////
  ////////////////////////////////

  $scope.permissions = deposit.access;
  $scope.new = [];
  $scope.changes = {};


  // Request users for autosuggestions
  // 
  $scope.getUsers = function (query) {
    return $http.get('/api/users', {
      params: {
        q: query
      }
    }).then(function(response){
      return response.data.hits.hits.map(function(item){
        return item.email;
      });
    });
  };

  $scope.onUserSelect = function(_item, _model, _label, model, form) {
      $scope.add_permission(_item, "user");
  };

  // var get_record_permissions = function() {
  //   capLocalClient.get_record_permissions($scope.pid_value)
  //   .then(function(response) {
  //     $scope.permissions =
  //     $scope.upd_permissions = [];
  //     $scope.collab_egroup = response.data.collab_egroup;
  //   }, function(error) {
  //     $scope.hello = "ERROR";
  //   }, function(update){
  //     $scope.notification = $scope.notification + '<br />' + update;
  //   });
  // };

  $scope.changePrivacy = function(pid_value){
    capLocalClient.change_record_privacy(pid_value)
    .then(function(response) {
      $scope.privacy = response;
    }, function(error) {
      $scope.hello = "ERROR";
    }, function(update){
      $scope.notification = $scope.notification + '<br />' + update;
    });
  };

  // $scope.get_permissions = function(){
  //   $scope.permissions = $scope.deposit.access;
  // };

  $scope.add_permissions = function(permissions){
    // Cleaning "garbage" entries from newly added users, where
    // "op" is "remove"

    var permissions_update = [];
    angular.forEach(permissions, function(actions, identity){
      if (angular.isArray(actions) && actions.length > 0) {
        var identity_permission = {
          "identity": identity,
          "type":  actions[0].type,
          "permissions": []
        };

        angular.forEach(actions, function(action){
          var _action = {
            "op": action.op,
            "action": action.action
          };

          identity_permission["permissions"].push(_action);
        }); 

        permissions_update.push(identity_permission);    
      }

    });

    return $http({
        url: $scope.deposit.links.permissions, 
        method: 'POST',
        data: {
          permissions: permissions_update
        }
    }).then(function(response){
      return response.data.hits.hits.map(function(item){
        return item.email;
      });
    });
  };

  // $scope.query = "";
  // $scope.permissionsPopup = $scope.query.length ? true : false;
  $scope.add_permission = function(identity, identity_type){
    if (!(identity_type && identity_type.indexOf(["user", "egroup"])  ))
      return;

    var add = {
      "op": "add",
      "type": identity_type,
      "action": "deposit-read",
      "identity" : identity
    };

    $scope.permissions.push(add);
    $scope.new.push(identity);
    $scope.query = "";
  };

  $scope.toggle_permission_action = function(identity, identity_type, action){
    if (!(identity_type && identity_type.indexOf(["user", "egroup"])  ))
      return;

    var identity_action = _.find($scope.permissions, function(p){
      return ( p["action"] == action && p["identity"] == identity);
    });

    if(identity_action) {
      if (identity_action["op"]){
        if ($scope.new.indexOf(identity) !== -1 && identity_action["op"] == "remove")
          identity_action["op"] = "add";
        else if ($scope.new.indexOf(identity) !== -1 && identity_action["op"] == "add")
          identity_action["op"] = "remove";
        else
          delete identity_action["op"];
      }
      else {
        identity_action["op"] = "remove";
      }
    }
    else {
      var operation = {
        "op": "add",
        "type": identity_type,
        "identity": identity,
        "action": action
      };
      $scope.permissions.push(operation);
    }
  };

  var validateEmail = function(email) {
    var re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
  };
};

capDepositCtrl.$inject = [
  '$scope',
  '$location',
  '$http',
  'deposit',
  'contentBarTabs'
];

angular.module('cap.controllers')
  .controller('DepositController', capDepositCtrl);


var capKeyNavigation = function ($timeout) {
    return function (scope, element, attrs) {
        element.bind("keydown keypress", function (event) {
            if (event.which === 38) {
                var target = $(event.target).prev();
                $(target).trigger('focus');
            }
            if (event.which === 40) {
                var target = $(event.target).next();
                $(target).trigger('focus');
            }
        });
    };
}


angular.module('cap.controllers')
  .directive('keyNavigation', capKeyNavigation);

