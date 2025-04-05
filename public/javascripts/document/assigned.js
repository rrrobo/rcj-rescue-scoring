var app = angular.module("AssignedDocuments", ['ngTouch','ngAnimate', 'ui.bootstrap', 'pascalprecht.translate', 'ngCookies']);
app.controller('AssignedDocumentsController', ['$scope', '$uibModal', '$log', '$http', '$translate', '$sce', function ($scope, $uibModal, $log, $http, $translate, $sce) {

    $scope.trust = function(html){
        return($sce.trustAsHtml(html));
    }

    $scope.competitionId = competitionId;

    $scope.mode = "select";

    $http.get(`/api/document/${competitionId}/assigned`).then(function (response) {
        $scope.assigned = response.data
        $scope.asKeys = Object.keys($scope.assigned.assignedTeams);
    })

    $http.get("/api/competitions/leagues").then(function (response) {
        $scope.leagues = response.data;
    })

    $scope.getLeagueName = function(lid) {
        return $scope.leagues.find((l) => l.id == lid).name;
    }

    $scope.goReview = function (teamId) {
        window.location = `/document/review/${teamId}?return=/document/assigned/${competitionId}`;
    }

    $scope.go = function (path) {
        window.location = path
    }

    $scope.getBadgeColor = function (team) {
        let assignedNum = team.assienedQuestionsNum;
        let answeredNum = team.answeredQuestionsNum;

        if (assignedNum == answeredNum) {
            return "badge-success";
        }
        if (answeredNum == 0) {
            return "badge-danger";
        }
        return "badge-warning";
    }
    
}]);
