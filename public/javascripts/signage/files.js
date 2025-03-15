var app = angular.module("SignageFile", ['ngTouch','ngAnimate', 'pascalprecht.translate', 'ngCookies', 'ngFileUpload']);

app.controller("SignageFileController", ['$scope', '$http', '$translate', 'Upload', function ($scope, $http, $translate, Upload) {
    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000
    });

    let upload_mes;
    $translate('document.uploaded').then(function (val) {
        upload_mes = val;
    }, function (translationId) {
    // = translationId;
    });

    let trans = [];
    function loadTranslation(tag){
        $translate(`cabinet.js.${tag}`).then(function (val) {
            trans[tag] = val;
        }, function (translationId) {
        // = translationId;
        });
    }

    loadTranslation("delAsk");
    loadTranslation("delConfirm");
    loadTranslation("delComplete");
    loadTranslation("delCompleteMes");
    loadTranslation("delConfirmButton");
    loadTranslation("delCancelButton");

    $scope.go = function (path) {
        window.location = path
    }

    function updateFiles(){
        $http.get(`/api/signage/contentList`).then(function (response) {
            $scope.files = response.data
        })
    }
    updateFiles();

    $scope.fileIcon = function(type){
        if(type == null) return "fa-file";
        switch(type){
            case 'text/plain':
                return "fa-file-alt";
            case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                return "fa-file-word";
            case 'application/pdf':
                return "fa-file-pdf";
            case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
                return "fa-file-excel";
            case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
                return "fa-file-powerpoint"
            case 'application/zip':
                return "fa-file-archive";
        }
        if(type.includes("video")) return "fa-file-video";
        if(type.includes("image")) return "fa-file-image";
        return "fa-file";
    }

    $scope.upload = function(file, errFiles) {
        $scope.f = file;
        $scope.errFile = errFiles && errFiles[0];
        if($scope.errFile){
            Toast.fire({
                type: 'error',
                title: "Error",
                html: $scope.errFile.$error + ' : ' + $scope.errFile.$errorParam
            })
        }
        if (file) {
            $scope.uploading = true;
            file.upload = Upload.upload({
                url: `/api/signage/contentList/upload`,
                data: {file: file}
            });

            file.upload.then(function (response) {
                    updateFiles();
                    file.result = response.data;
                    Toast.fire({
                        type: 'success',
                        title: upload_mes
                    })
                    delete $scope.f;
            }, function (response) {
                if (response.status > 0){
                    $scope.errorMsg = response.status + ': ' + response.data.msg;
                     Toast.fire({
                        type: 'error',
                        title: "Error: " + response.statusText,
                        html: response.data.msg
                    })
                }
            }, function (evt) {
                file.progress = Math.min(100, parseInt(100.0 * 
                                         evt.loaded / evt.total));
            });
        }   
    }

    $scope.delete = function(file){
        Swal.fire({
            title: trans['delAsk'],
            html: `${trans['delConfirm']}<br><strong>${file.name}</strong>`,
            type: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: trans['delConfirmButton'],
            cancelButtonText: trans['delCancelButton']
            }).then((result) => {
            if (result.value) {
                $http.delete(`/api/signage/contentList/${encodeURIComponent(file.name)}`).then(function (response) {
                    Swal.fire(
                        trans['delComplete'],
                        `${file.name} ${trans['delCompleteMes']}`,
                        'success'
                    )
                    updateFiles();
                }, function (response) {
                    Swal.fire(
                        'Oops...',
                        response.data.msg,
                        'error'
                    )
                    updateFiles();
                });
            }
        })  
    }
}])
