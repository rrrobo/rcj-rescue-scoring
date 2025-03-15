var app = angular.module("SignageSetting", ['ngTouch','pascalprecht.translate', 'ngCookies']);
app.controller("SignageSettingController", ['$scope', '$http', function ($scope, $http) {
  
  updateSignageList()
    
  $scope.removeSig = function (sig) {
    if (confirm("Are you sure you want to remove the signage setting: " + sig.name + '?')) {
      $http.delete("/api/signage/" + sig._id).then(function (response) {
        console.log(response)
        updateSignageList()
      }, function (error) {
        console.log(error)
      })
    }
  }
  
  function updateSignageList() {
    $http.get("/api/signage/").then(function (response) {
      console.log(response)
      $scope.signs = response.data
    })
  }
    
    $scope.go = function (path) {
        window.location = path
    }
}])