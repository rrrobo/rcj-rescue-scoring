// register the directive with your app module
var app = angular.module('SimEditor', ['ngTouch','ngAnimate', 'ui.bootstrap', 'pascalprecht.translate', 'ngCookies']);

// function referenced by the drop target
app.controller('SimEditorController', ['$scope', '$uibModal', '$log', '$http','$translate', function ($scope, $uibModal, $log, $http, $translate) {

    $scope.competitionId = competitionId;
    $scope.mapId = mapId;
    $translate('admin.simMapEditor.import').then(function (val) {
        $("#select").fileinput({'showUpload':false, 'showPreview':false, 'showRemove':false, 'showCancel':false  ,'msgPlaceholder': val,allowedFileExtensions: ['json'] , msgValidationError: "ERROR"});
    }, function (translationId) {
        // = translationId;
    });

    let trans = [];
    function loadTranslation(tag){
        $translate(`admin.simMapEditor.js.${tag}`).then(function (val) {
            trans[tag] = val;
        }, function (translationId) {
        // = translationId;
        });
    }

    loadTranslation("startTileError");

    $scope.z = 0;
    $scope.startTile = {
        x: 0,
        y: 0,
        z: 0
    };
    $scope.height = 1;
    $scope.width = 1;
    $scope.length = 1;
    $scope.time = 480;
    $scope.name = "Awesome world";
    $scope.cells = {};
    $scope.dice = [];
    $scope.saveasname ="";
    $scope.finished = true;
    $scope.selectRoom = -1;
    $scope.roomTiles = [[], [], []];
    $scope.roomColors = ["red", "green", "blue"]
    $scope.area4Room = 0
    $scope.room4VicTypes = [];
    $scope.area4 = [
        {value: "None", type: 0},
        {value: "Custom Room", type: 1},
        {
            value: "Option 1 (7x5)", 
            type: 2,
            width: 7,
            height: 5,
            room1Tile: [0, -1],
            room3Tile: [6, -1],
            humans: [
                {
                    x: 0.01,
                    z: 0.238,
                    rot: 1.5708,
                    type: "harmed",
                    score: 15,
                }
            ],
            hazards: [
                {
                    x: 0.548,
                    z: 0.193396,
                    rot: 1.05,
                    type: "P",
                    score: 30,
                }
            ],
        },
        {
            value: "Option 2 (6x6)", 
            type: 3,
            width: 6,
            height: 6,
            room1Tile: [-1, 0],
            room3Tile: [2, 6],
            humans: [
                {
                    x: 0.33,
                    z: 0.3,
                    rot: 0,
                    type: "unharmed",
                    score: 15,
                },
                {
                    x: 0.4991,
                    z: 0.27366,
                    rot: 2.0944,
                    type: "harmed",
                    score: 15,
                }
            ],
            hazards: [
                {
                    x: 0.14,
                    z: 0.299,
                    rot: 0,
                    type: "C",
                    score: 30,
                },
                {
                    x: 0.564142,
                    z: 0.474142,
                    rot: 0.785398,
                    type: "P",
                    score: 30,
                }
            ],
        },
    ]

    // Custom room 4 setup
    let useCustomRoom4 = document.getElementById("showRoom4Canvas");
    $scope.room4Img = new Image;
    /*let imgElement = document.getElementById("inputImg");
    let inputElement = document.getElementById("selectImg");
    inputElement.addEventListener("change", (e) => {
        imgElement.src = URL.createObjectURL(e.target.files[0]);
    }, false);*/

    $scope.range = function (n) {
        arr = [];
        for (var i = 0; i < n; i++) {
            arr.push(i);
        }
        return arr;
    }

    $scope.changeFloor = function (z){
        $scope.z = z;
    }

    $scope.go = function (path) {
        window.location = path
    }

    $scope.$watchCollection('startTile', function (newValue, oldValue) {
        $scope.recalculateLinear();
    });

    $scope.$watchCollection('cells', function (newValue, oldValue) {
        $scope.recalculateLinear();
    });

    $scope.isUndefined = function (thing) {
        return (typeof thing === "undefined");
    }
    $scope.recalculateLinear = function () {
        console.log("update");
        //console.log($scope.cells)
        $scope.virtualWall = [];
        //console.log($scope.cells);
        if ($scope.startNotSet())
            return;

        // Reset all previous linear walls
        for (var index in $scope.cells) {
            $scope.cells[index].isLinear = false;
            $scope.cells[index].virtualWall = false;
            $scope.cells[index].reachable= false;
            $scope.cells[index].explored= false;
            if ($scope.cells[index].tile) {
                if($scope.cells[index].tile.curve == undefined)
                    $scope.cells[index].tile.curve = [0, 0, 0, 0]; //NW quadrant, NE, SW, SE
                if($scope.cells[index].tile.halfWallIn == undefined)
                    $scope.cells[index].tile.halfWallIn = [0, 0, 0, 0];
                if(!$scope.cells[index].tile.halfWallVic)
                    $scope.cells[index].tile.halfWallVic = [];
            }
        }
        
        // Set to virtual wall around the black tile and start tile
        let startTilePosition = $scope.startTile.x + "," + $scope.startTile.y + "," + $scope.startTile.z;
        for (var index in $scope.cells) {
            if($scope.cells[index].tile){
                if($scope.cells[index].tile.black || index == startTilePosition){
                    var x = Number(index.split(',')[0]);
                    var y = Number(index.split(',')[1]);
                    var z = Number(index.split(',')[2]);
                    if($scope.cells[x + "," + (y-1) + "," + z]) $scope.cells[x + "," + (y-1) + "," + z].virtualWall = true;
                    else $scope.cells[x + "," + (y-1) + "," + z] = {virtualWall: true};

                    if($scope.cells[(x+1) + "," + y + "," + z]) $scope.cells[(x+1) + "," + y + "," + z].virtualWall = true;
                    else $scope.cells[(x+1) + "," + y + "," + z] = {virtualWall: true};

                    if($scope.cells[(x-1) + "," + y + "," + z]) $scope.cells[(x-1) + "," + y + "," + z].virtualWall = true;
                    else $scope.cells[(x-1) + "," + y + "," + z] = {virtualWall: true};

                    if($scope.cells[x + "," + (y+1) + "," + z]) $scope.cells[x + "," + (y+1) + "," + z].virtualWall = true;
                    else $scope.cells[x + "," + (y+1) + "," + z] = {virtualWall: true};

                }
            }
        }

        // Start it will all 4 walls around the starting tile

        recurs($scope.startTile.x - 1, $scope.startTile.y, $scope.startTile.z);
        recurs($scope.startTile.x + 1, $scope.startTile.y, $scope.startTile.z);
        recurs($scope.startTile.x, $scope.startTile.y - 1, $scope.startTile.z);
        recurs($scope.startTile.x, $scope.startTile.y + 1, $scope.startTile.z);

        //Top Left
        recurs($scope.startTile.x-1, $scope.startTile.y - 2, $scope.startTile.z);
        recurs($scope.startTile.x-2, $scope.startTile.y - 1, $scope.startTile.z);

        //Top Right
        recurs($scope.startTile.x+1, $scope.startTile.y - 2, $scope.startTile.z);
        recurs($scope.startTile.x+2, $scope.startTile.y - 1, $scope.startTile.z);

        //Bottom Left
        recurs($scope.startTile.x-1, $scope.startTile.y + 2, $scope.startTile.z);
        recurs($scope.startTile.x-2, $scope.startTile.y + 1, $scope.startTile.z);

        //Bottom Right
        recurs($scope.startTile.x+1, $scope.startTile.y + 2, $scope.startTile.z);
        recurs($scope.startTile.x+2, $scope.startTile.y + 1, $scope.startTile.z);

        //Search reachable tiles
        quarterReachable = [];
        reachable($scope.startTile.x, $scope.startTile.y, $scope.startTile.z);
    }

    const UP = 0, RIGHT = 1, DOWN = 2, LEFT = 3;
    let quarterReachable;

    function curveBlock(toDir, fromDir, curve) {
        // if continuing straight, any curve wall will block
        // if curve has orientation 2 or 4, the following are blocked:
        //      UP <-> RIGHT, DOWN <-> LEFT 
        //      aka toDir + fromDir == 1 || toDir + fromDir == 5
        // if curve has orientation 1 or 3, the following are blocked:
        //      UP <-> LEFT, DOWN <-> RIGHT
        //      aka toDir + 1 and fromDir + 1 satisfies prev condition 
        const tmpToDir = (toDir + 1) % 4, tmpFromDir = (fromDir + 1) % 4;
        return curve != 0 && ((toDir == (fromDir + 2) % 4) || 
                (curve % 2 == 0 && (toDir + fromDir == 1 || toDir + fromDir == 5)) || 
                (curve % 2 == 1 && (tmpToDir + tmpFromDir == 1 || tmpToDir + tmpFromDir == 5)));
    }

    function getHalfWall(x, y, z) {
        if (!$scope.cells[x+','+y+','+z]) return 0;
        return $scope.cells[x+','+y+','+z].halfWall;
    }

    function getWall(x, y, z) {
        if (!$scope.cells[x+','+y+','+z]) return 0;
        return $scope.cells[x+','+y+','+z].isWall;
    }

    function blocked(x, y, z, halfWallSide) {
        return getWall(x,y,z) || getHalfWall(x,y,z) == halfWallSide;
    }

    function reachable(x,y,z,i=-1,dir=-1){
        if(x<0 || x>$scope.width*2 || y<0 || y>$scope.length*2) return;
        let cell = $scope.cells[x+','+y+','+z];
        if(cell){
            if (!cell.tile.halfTile) i = -1; // if going from quarter tile to full tile
            if (i == -1 && !cell.tile.halfTile) { // if going from full tile to full tile
                if($scope.cells[x+','+y+','+z].reachable) return;
                $scope.cells[x+','+y+','+z].reachable = true;
            }
            else {
                const qr = quarterReachable[i+','+x+','+y+','+z];
                if ((cell.tile.curve[i] == 0 && qr != undefined) ||
                    (cell.tile.curve[i] != 0 && qr != undefined && qr.find((i) => {return i == dir}) != undefined)) return;

                if (qr == undefined)
                    quarterReachable[i+','+x+','+y+','+z] = [dir];
                else
                    quarterReachable[i+','+x+','+y+','+z].push(dir);
                $scope.cells[x+','+y+','+z].reachable = true;
            }
        }else{
            $scope.cells[x+','+y+','+z] = {
                isTile: true,
                tile: {
                    changeFloorTo: z,
                    halfWallIn: [0,0,0,0],
                    curve: [0,0,0,0]
                },
                reachable: true
            };
        }
        cell = $scope.cells[x+','+y+','+z];

        //console.log(`${x},${y},${z}`)
        //console.log(cell)

        if (cell.tile.halfTile && i == -1) {
            // check if going from non quarter title to quarter tile

            if ((dir == UP && !blocked(x,y-1,z,1)) || dir == -1)
                reachable(x,y,z,0,UP);
            if ((dir == UP && !blocked(x,y-1,z,2)) || dir == -1)
                reachable(x,y,z,1,UP);
            if ((dir == RIGHT && !blocked(x+1,y,z,2)) || dir == -1)
                reachable(x,y,z,1,RIGHT);
            if ((dir == RIGHT && !blocked(x+1,y,z,1)) || dir == -1)
                reachable(x,y,z,3,RIGHT);
            if ((dir == DOWN && !blocked(x,y+1,z,2)) || dir == -1)
                reachable(x,y,z,3,DOWN);
            if ((dir == DOWN && !blocked(x,y+1,z,1)) || dir == -1)
                reachable(x,y,z,2,DOWN);
            if ((dir == LEFT && !blocked(x-1,y,z,1)) || dir == -1)
                reachable(x,y,z,2,LEFT);
            if ((dir == LEFT && !blocked(x-1,y,z,2)) || dir == -1)
                reachable(x,y,z,0,LEFT);
        }
        else if (i == -1) {
            // full tile navigation

            //Upper
            if(!(($scope.cells[x+','+(y-1)+','+z] && $scope.cells[x+','+(y-1)+','+z].isWall))) {
                reachable(x,y-2,z,-1,DOWN)
            }

            //console.log(((cell.tile.halfWallIn[3] || cell.tile.curve[0] || cell.tile.curve[2]) && (cell.tile.halfWallIn[1] || cell.tile.curve[1] || cell.tile.curve[3])))
            //console.log(!(($scope.cells[x+','+(y+1)+','+z] && $scope.cells[x+','+(y+1)+','+z].isWall) || ((cell.tile.halfWallIn[3] || cell.tile.curve[0] || cell.tile.curve[2]) && (cell.tile.halfWallIn[1] || cell.tile.curve[1] || cell.tile.curve[3]))))
            //Bottom
            if(!(($scope.cells[x+','+(y+1)+','+z] && $scope.cells[x+','+(y+1)+','+z].isWall))) {
                reachable(x,y+2,z,-1,UP)
            }

            //Right
            if(!(($scope.cells[(x+1)+','+y+','+z] && $scope.cells[(x+1)+','+y+','+z].isWall))) {
                reachable(x+2,y,z,-1,LEFT)
            }

            //Left
            if(!(($scope.cells[(x-1)+','+y+','+z] && $scope.cells[(x-1)+','+y+','+z].isWall))) {
                reachable(x-2,y,z,-1,RIGHT)
            }
        }
        else {
            //quarter tile navigation
            // +-+-+
            // |a|b|
            // +-+-+    (1 tile)
            // |c|d|
            // +-+-+
            // a: i = 0
            // b: i = 1
            // c: i = 2
            // d: i = 3

            // dir represents direction of entry into quarter tile
            // relevant for calculating traversable curved walls

            if (i == 0) {
                if (!(blocked(x,y-1,z,1) || 
                    curveBlock(UP, dir, cell.tile.curve[i])))
                    reachable(x, y-2, z, 2, DOWN);           // up
                if (!(cell.tile.halfWallIn[UP] ||
                    curveBlock(RIGHT, dir, cell.tile.curve[i])))
                    reachable(x, y, z, 1, LEFT);             // right
                if (!(cell.tile.halfWallIn[LEFT] ||
                    curveBlock(DOWN, dir, cell.tile.curve[i])))
                    reachable(x, y, z, 2, UP);               // down
                if (!(blocked(x-1,y,z,2) || 
                    curveBlock(LEFT, dir, cell.tile.curve[i])))
                    reachable(x-2, y, z, 1, RIGHT);          // left
            }
            else if (i == 1) {
                if (!(blocked(x,y-1,z,2) || 
                    curveBlock(UP, dir, cell.tile.curve[i])))
                    reachable(x, y-2, z, 3, DOWN);
                if (!(blocked(x+1,y,z,2) || 
                    curveBlock(RIGHT, dir, cell.tile.curve[i])))
                    reachable(x+2, y, z, 0, LEFT);
                if (!(cell.tile.halfWallIn[RIGHT] ||
                    curveBlock(DOWN, dir, cell.tile.curve[i])))
                    reachable(x, y, z, 3, UP);
                if (!(cell.tile.halfWallIn[UP] ||
                    curveBlock(LEFT, dir, cell.tile.curve[i])))
                    reachable(x, y, z, 0, RIGHT);
            }
            else if (i == 2) {
                if (!(cell.tile.halfWallIn[LEFT] ||
                    curveBlock(UP, dir, cell.tile.curve[i])))
                    reachable(x, y, z, 0, DOWN);
                if (!(cell.tile.halfWallIn[DOWN] ||
                    curveBlock(RIGHT, dir, cell.tile.curve[i])))
                    reachable(x, y, z, 3, LEFT);
                if (!(blocked(x,y+1,z,1) || 
                    curveBlock(DOWN, dir, cell.tile.curve[i])))
                    reachable(x, y+2, z, 0, UP);
                if (!(blocked(x-1,y,z,1) || 
                    curveBlock(LEFT, dir, cell.tile.curve[i])))
                    reachable(x-2, y, z, 3, RIGHT);
            }
            else if (i == 3) {
                if (!(cell.tile.halfWallIn[RIGHT] ||
                    curveBlock(UP, dir, cell.tile.curve[i])))
                    reachable(x, y, z, 1, DOWN);
                if (!(blocked(x+1,y,z,1) || 
                    curveBlock(RIGHT, dir, cell.tile.curve[i])))
                    reachable(x+2, y, z, 2, LEFT);
                if (!(blocked(x,y+1,z,2) || 
                    curveBlock(DOWN, dir, cell.tile.curve[i])))
                    reachable(x, y+2, z, 1, UP);
                if (!(cell.tile.halfWallIn[DOWN] ||
                    curveBlock(LEFT, dir, cell.tile.curve[i])))
                    reachable(x, y, z, 2, RIGHT);
            }
        }
    }


    function isOdd(num) {
        return num % 2;
    }

    function recurs(x, y, z, fromDir=-1) {
        if (x < 0 || y < 0 || z < 0) {
            return;
        }

        let cell = $scope.cells[x + ',' + y + ',' + z];

        // If this is a wall that doesn't exists
        if (!cell)
            return;
        // Outside of the current maze size.
        if (x > $scope.width * 2 + 1 || x < 0 ||
            y > $scope.length * 2 + 1 || y < 0 ||
            z > $scope.height || z < 0)
            return;

        // Already visited this, returning
        if (cell.isLinear)
            return;
        if (cell.isWall || cell.virtualWall) {
            cell.isLinear = true;


            // horizontal walls
            if (isOdd(x) && !isOdd(y)) {
                // Set tiles around this wall to linear
                setTileLinear(x - 2, y - 1, z);
                setTileLinear(x, y - 1, z);
                setTileLinear(x + 2, y - 1, z);
                setTileLinear(x - 2, y + 1, z);
                setTileLinear(x, y + 1, z);
                setTileLinear(x + 2, y + 1, z);
                // Check neighbours
                recurs(x + 2, y, z, 3);
                recurs(x - 2, y, z, 1);
                recurs(x - 1, y - 1, z, 2);
                recurs(x - 1, y + 1, z, 0);
                recurs(x + 1, y - 1, z, 2);
                recurs(x + 1, y + 1, z, 0);
                // Explore the wall in the tile (TOP)
                exploreWallInTile(x, y - 1, z, 2);
                // Explore the wall in the tile (BOTTOM)
                exploreWallInTile(x, y + 1, z, 0);

                checkCurve(x-2, y-1, z, 3);
                checkCurve(x-2, y+1, z, 1);
                checkCurve(x+2, y-1, z, 2);
                checkCurve(x+2, y-1, z, 0);

            } // Vertical wall
            else if (!isOdd(x) && isOdd(y)) {
                // Set tiles around this wall to linear
                setTileLinear(x - 1, y - 2, z);
                setTileLinear(x - 1, y, z);
                setTileLinear(x - 1, y + 2, z);
                setTileLinear(x + 1, y - 2, z);
                setTileLinear(x + 1, y, z);
                setTileLinear(x + 1, y + 2, z);
                // Check neighbours
                recurs(x, y - 2, z, 2);
                recurs(x, y + 2, z, 0);
                recurs(x - 1, y - 1, z, 1);
                recurs(x - 1, y + 1, z, 1);
                recurs(x + 1, y - 1, z, 3);
                recurs(x + 1, y + 1, z, 3);
                // Explore the wall in the tile (LEFT)
                exploreWallInTile(x - 1, y, z, 1)
                // Explore the wall in the tile (RIGHT)
                exploreWallInTile(x + 1, y, z, 3)

                checkCurve(x-1, y-2, z, 3);
                checkCurve(x-1, y+2, z, 1);
                checkCurve(x+1, y-2, z, 2);
                checkCurve(x+1, y-2, z, 0);
            }

        }
        
        if(cell.halfWall > 0){
            if(fromDir == 4) cell.isLinear = true;
            if(x%2 == 0){
                // Vertical
                if(cell.halfWall == 1 && (fromDir == 2 || fromDir == 4)){
                    cell.isLinear = true;
                    recurs(x, y + 2, z, 0);
                    recurs(x + 1, y + 1, z, 3);
                    recurs(x - 1, y + 1, z, 1);
                    
                    // Explore the wall in the tile (LEFT)
                    exploreWallInTile(x - 1, y, z, 1)
                    // Explore the wall in the tile (RIGHT)
                    exploreWallInTile(x + 1, y, z, 3)

                    curveFromHalfWall(x-1, y, z, 1)
                    curveFromHalfWall(x+1, y, z, 3)
                }else if(cell.halfWall == 2 && (fromDir == 0 || fromDir == 4)){
                    cell.isLinear = true;
                    recurs(x, y - 2, z, 2);
                    recurs(x + 1, y - 1, z, 3);
                    recurs(x - 1, y - 1, z, 1);
                    
                    // Explore the wall in the tile (LEFT)
                    exploreWallInTile(x - 1, y, z, 1)
                    // Explore the wall in the tile (RIGHT)
                    exploreWallInTile(x + 1, y, z, 3)

                    curveFromHalfWall(x-1, y, z, 1)
                    curveFromHalfWall(x+1, y, z, 3)
                }
            }else{
                // Horizontal
                if(cell.halfWall == 1 && (fromDir == 3 || fromDir == 4)){
                    cell.isLinear = true;
                    recurs(x - 2, y, z, 1);
                    recurs(x - 1, y - 1, z, 2);
                    recurs(x - 1, y + 1, z, 0);              
                    // Explore the wall in the tile (TOP)
                    exploreWallInTile(x, y - 1, z, 2)
                    // Explore the wall in the tile (BOTTOM)
                    exploreWallInTile(x, y + 1, z, 0)

                    curveFromHalfWall(x, y-1, z, 2)
                    curveFromHalfWall(x, y+1, z, 0)
                }else if(cell.halfWall == 2 && (fromDir == 1 || fromDir == 4)){
                    cell.isLinear = true;
                    recurs(x + 2, y, z, 3);
                    recurs(x + 1, y - 1, z, 2);
                    recurs(x + 1, y + 1, z, 0);
                    // Explore the wall in the tile (TOP)
                    exploreWallInTile(x, y - 1, z, 2)
                    // Explore the wall in the tile (BOTTOM)
                    exploreWallInTile(x, y + 1, z, 0)

                    curveFromHalfWall(x, y-1, z, 2)
                    curveFromHalfWall(x, y+1, z, 0)
                }
            }
        }
    }

    function checkCurve(x, y, z, from){
        let cell = $scope.cells[x + ',' + y + ',' + z];

        // If this is a wall that doesn't exists
        if (!cell) return;
        if (!cell.tile) return;
        if (!cell.tile.curve) return;

        switch(from){
            case 0:
                if(cell.tile.curve[0] == 1 || cell.tile.curve[2] == 3){
                    halfTileFromCenter(x, y, z);
                    curveFromCenter(x, y, z, from);
                }
                break;
            case 1:
                if(cell.tile.curve[1] == 2 || cell.tile.curve[1] == 4){
                    halfTileFromCenter(x, y, z);
                    curveFromCenter(x, y, z, from);
                }
                break;
            case 2:
                if(cell.tile.curve[2] == 2 || cell.tile.curve[2] == 4){
                    halfTileFromCenter(x, y, z);
                    curveFromCenter(x, y, z, from);
                }
                break;
            case 3:
                if(cell.tile.curve[3] == 1 || cell.tile.curve[3] == 3){
                    halfTileFromCenter(x, y, z);
                    curveFromCenter(x, y, z, from);
                }
                break;
        }
    }

    function exploreWallInTile(x, y, z, fromDir){
        if (x < 0 || y < 0 || z < 0) {
            return;
        }
        
        let cell = $scope.cells[x + ',' + y + ',' + z];

        // If this is a wall that doesn't exists
        if (!cell) return;

        if(!cell.tile) return;
        if(!cell.tile.halfWallIn) return;
        if(!cell.tile.halfWallIn[fromDir]) return;
        if(cell.explored) return;
        else cell.explored = true;
        
        halfTileFromCenter(x, y, z, fromDir);
        curveFromCenter(x, y, z);
    }

    function halfTileFromCenter(x, y, z, exclude=-1){
        let cell = $scope.cells[x + ',' + y + ',' + z];

        // If this is a wall that doesn't exists
        if (!cell) return;

        for(let i=0; i<4; i++){
            if(cell.tile.halfWallIn[i] && i != exclude){
                switch(i){
                    case 0:
                        setTileLinear(x, y - 2, z);
                        recurs(x, y - 1, z, 4);
                        exploreWallInTile(x, y - 2, z, 2)
                        break;
                    case 1:
                        setTileLinear(x + 2, y, z);
                        recurs(x + 1, y, z, 4);
                        exploreWallInTile(x + 2, y, z, 3);
                        break;
                    case 2:
                        setTileLinear(x, y + 2, z);
                        recurs(x, y + 1, z, 4);
                        exploreWallInTile(x, y + 2, z, 0);
                        break;
                    case 3:
                        setTileLinear(x - 2, y, z);
                        recurs(x - 1, y, z, 4);
                        exploreWallInTile(x - 2, y, z, 1);
                        break;
                }

            }
        }
    }

    function curveFromHalfWall(x, y, z, start){
        let cell = $scope.cells[x + ',' + y + ',' + z];
        // If this is a wall that doesn't exists
        if (!cell) return;

        switch(start){
            case 0:
                if(cell.tile.curve[0] == 2 || cell.tile.curve[0] == 4){
                    recurs(x-1, y, z, 4);
                    setTileLinear(x-2, y, z);
                }
                if(cell.tile.curve[1] == 1 || cell.tile.curve[1] == 3){
                    recurs(x+1, y, z, 4);
                    setTileLinear(x+2, y, z);
                }
                break;
            case 1:
                if(cell.tile.curve[3] == 2 || cell.tile.curve[3] == 4){
                    recurs(x, y+1, z, 4);
                    setTileLinear(x, y+2, z);
                }
                if(cell.tile.curve[1] == 1 || cell.tile.curve[1] == 3){
                    recurs(x, y-1, z, 4);
                    setTileLinear(x, y-2, z);
                }
                break;
            case 2:
                if(cell.tile.curve[3] == 2 || cell.tile.curve[3] == 4){
                    recurs(x+1, y, z, 4);
                    setTileLinear(x+2, y, z);
                }
                if(cell.tile.curve[2] == 1 || cell.tile.curve[2] == 3){
                    recurs(x-1, y, z, 4);
                    setTileLinear(x-2, y, z);
                }
                break;
            case 3:
                if(cell.tile.curve[0] == 2 || cell.tile.curve[0] == 4){
                    recurs(x, y-1, z, 4);
                    setTileLinear(x, y-2, z);
                }
                if(cell.tile.curve[2] == 1 || cell.tile.curve[2] == 3){
                    recurs(x, y+1, z, 4);
                    setTileLinear(x, y+2, z);
                }
                break;
        }
    }

    function curveFromCenter(x, y, z, exclude=-1){
        let cell = $scope.cells[x + ',' + y + ',' + z];
        // If this is a wall that doesn't exists
        if (!cell) return;
        if((cell.tile.curve[0] == 1 || cell.tile.curve[0] == 3) && exclude != 0){
            // to TOP LEFT
            recurs(x - 1, y-2, z, 2);
            recurs(x - 1, y, z, 0);
            recurs(x - 2, y-1, z, 1);
            recurs(x, y-1, z, 3);
            setTileLinear(x, y-2, z);
            setTileLinear(x-2, y-2, z);
            setTileLinear(x-2, y, z);
        }
        if((cell.tile.curve[1] == 2 || cell.tile.curve[1] == 4) && exclude != 1){
            // to TOP RIGHT
            recurs(x + 1, y-2, z, 2);
            recurs(x + 1, y, z, 0);
            recurs(x + 2, y-1, z, 3);
            recurs(x, y-1, z, 1);
            setTileLinear(x, y-2, z);
            setTileLinear(x+2, y-2, z);
            setTileLinear(x+2, y, z);
        }
        if((cell.tile.curve[3] == 1 || cell.tile.curve[3] == 3) && exclude != 3){
            // to BOTTOM RIGHT
            recurs(x + 1, y+2, z, 0);
            recurs(x + 1, y, z, 2);
            recurs(x + 2, y+1, z, 3);
            recurs(x, y+1, z, 1);
            setTileLinear(x+2, y, z);
            setTileLinear(x+2, y+2, z);
            setTileLinear(x, y+2, z);
        }
        if((cell.tile.curve[2] == 2 || cell.tile.curve[2] == 4) && exclude != 2){
            // to BOTTOM LEFT
            recurs(x - 1, y+2, z, 0);
            recurs(x - 1, y, z, 2);
            recurs(x - 2, y+1, z, 1);
            recurs(x, y+1, z, 3);
            setTileLinear(x-2, y, z);
            setTileLinear(x-2, y+2, z);
            setTileLinear(x, y+2, z);
        }
    }

    function setTileLinear(x, y, z) {
        if (x < 0 || y < 0 || z < 0) {
            return;
        }

        // Check that this is an actual tile, not a wall
        var cell = $scope.cells[x + ',' + y + ',' + z];
        if (cell) {
            cell.isLinear = true;
        } else {
            $scope.cells[x + ',' + y + ',' + z] = {
                isTile: true,
                isLinear: true,
                tile: {
                    changeFloorTo: z
                }
            };
        }
    }

    $scope.startNotSet = function () {
        return $scope.startTile.x == 0 && $scope.startTile.y == 0 &&
            $scope.startTile.z == 0;
    }

    function Range(first, last) {
        var first = first.charCodeAt(0);
        var last = last.charCodeAt(0);
        var result = new Array();
        for(var i = first; i <= last; i++) {
            result.push(String.fromCodePoint(i));
        }
        return result;
    }
    var big = Range('A', 'Z');
    var small = Range('α', 'ω');

    $scope.isVictim = function(type,x,y,z){
        if($scope.cells[x + ',' + y + ',' + z] && $scope.cells[x + ',' + y + ',' + z].tile){
            if($scope.cells[x + ',' + y + ',' + z].tile.victims.bottom == type) return true;
            if($scope.cells[x + ',' + y + ',' + z].tile.victims.top == type) return true;
            if($scope.cells[x + ',' + y + ',' + z].tile.victims.right == type) return true;
            if($scope.cells[x + ',' + y + ',' + z].tile.victims.left == type) return true;
        }
        return false;
    };

    $scope.makeImage = function(){
        window.scrollTo(0,0);
        html2canvas(document.getElementById("outputImageArea"),{
            scale: 5
        }).then(function(canvas) {
            let ctx = canvas.getContext("2d");

            //Detect image area
            let topY = 0;
            for(let y=0;y<canvas.height;y++){
                let imagedata = ctx.getImageData(canvas.width/2, y, 1, 1);
                if(imagedata.data[0] != 255){
                    topY = y;
                    break;
                }
            }
            let bottomY = 0;
            for(let y=canvas.height-1;y>=0;y--){
                let imagedata = ctx.getImageData(canvas.width/2, y, 1, 1);
                if(imagedata.data[0] != 255){
                    bottomY = y;
                    break;
                }
            }
            mem_canvas = document.createElement("canvas");
            mem_canvas.width = canvas.width;
            mem_canvas.height = bottomY-topY;
            ctx2 = mem_canvas.getContext("2d");
            ctx2.drawImage(canvas, 0, topY, canvas.width, bottomY-topY, 0, 0, canvas.width, bottomY-topY);
            let imgData = mem_canvas.toDataURL();
            $http.post("/api/maps/line/image/" + mapId, {img: imgData}).then(function (response) {
                alert("Created image!");
            }, function (response) {
                console.log(response);
                console.log("Error: " + response.statusText);
                alert(response.data.msg);
            });
        });
    };

    $scope.makeImageDl = function(){
        window.scrollTo(0,0);
        html2canvas(document.getElementById("outputImageArea"),{
            scale: 5
        }).then(function(canvas) {
            let ctx = canvas.getContext("2d");

            //Detect image area
            let topY = 0;
            for(let y=0;y<canvas.height;y++){
                let imagedata = ctx.getImageData(canvas.width/2, y, 1, 1);
                if(imagedata.data[0] != 255){
                    topY = y;
                    break;
                }
            }
            let bottomY = 0;
            for(let y=canvas.height-1;y>=0;y--){
                let imagedata = ctx.getImageData(canvas.width/2, y, 1, 1);
                if(imagedata.data[0] != 255){
                    bottomY = y;
                    break;
                }
            }
            mem_canvas = document.createElement("canvas");
            mem_canvas.width = canvas.width;
            mem_canvas.height = bottomY-topY;
            ctx2 = mem_canvas.getContext("2d");
            ctx2.drawImage(canvas, 0, topY, canvas.width, bottomY-topY, 0, 0, canvas.width, bottomY-topY);
            let imgData = mem_canvas.toDataURL();
            downloadURI(imgData,$scope.name+'.png')
        });
    };

    function downloadURI(uri, name) {
        var link = document.createElement("a");
        link.download = name;
        link.href = uri;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        delete link;
    }

    $scope.tileColour = function(x,y,z,rotate=0){
        let cell = $scope.cells[x+','+y+','+z];
        if(!cell) return {};
        if(cell.isWall) return cell.isLinear?{'background-color': 'black'}:{'background-color': 'navy'};

        if(cell.halfWall > 0){
            let direction = 180*(cell.halfWall-1)+(y%2==1?0:90);

            //Wall color
            let color = 'navy';
            if(cell.isLinear) color = 'black';

            direction += rotate;
            if(direction>=360) direction-=360;

            let gradient = String(direction) + "deg," + color + " 0%," + color + " 50%,white 50%,white 100%";
            return {'background': 'linear-gradient(' + gradient + ')'};

        }
        if (x % 2 == 1 && y % 2 == 1){
            let css = {};
            if(cell.isLinear){
                css['background-color'] = '#fffdea';
            }else{
                css['background-color'] = '#b4ffd5';
            }
            if(cell.tile.color) css['background-color'] = cell.tile.color;
            if(cell.tile.swamp) css['background-color'] = '#CD853F';
            if(cell.tile.black) css['background-color'] = '#000000';
            if(cell.tile.checkpoint) css['background-image'] = 'linear-gradient(to top left, #A5A5A5, #BABAC2, #E8E8E8, #A5A5A5, #BABAC2)';
            let roomNumber = checkRoomNumber(x,y,z);
            if(roomNumber === 2){
                css['border-color'] = '#359ef4';
                css['border-width'] = '3px';
            }else if(roomNumber === 3){
                css['border-color'] = '#ed9aef';
                css['border-width'] = '3px';
            }else if(roomNumber === 4){
                css['border-color'] = '#7500FF';
                css['border-width'] = '3px';
            }
            if(!cell.reachable) css['background-color'] = '#636e72';
            return css;
        }
        return {};
            
    };

    function checkRoomNumber(x,y,z){
        for (let i = 0; i < $scope.roomTiles.length; i++) {
            if($scope.roomTiles[i].find(cord => cord === `${x},${y},${z}`)){
                return i + 2;
            }
        }
        return 1;
    }

    function checkRoomNumberKey(key){
        for (let i = 0; i < $scope.roomTiles.length; i++) {
            if($scope.roomTiles[i].find(cord => cord === key)){
                return i + 2;
            }
        }
        return 1;
    }


    $scope.export = function(){
        /*let canvas = document.getElementById('room4canvas');
        let ctx = canvas.getContext('2d');
        let imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let src = cv.matFromImageData(imgData);
        cv.imshow('outputCanvas', src);*/

        $scope.recalculateLinear();
        if ($scope.area4Room.value == "Custom Room") {
            createArea4Solid();
            createArea4Victims(0, 0);
        }
        var map = {
            name: $scope.name,
            length: $scope.length,
            height: $scope.height,
            width: $scope.width,
            finished: $scope.finished,
            startTile: $scope.startTile,
            cells: $scope.cells,
            roomTiles: $scope.roomTiles,
            time: $scope.time,
            area4Room: $scope.area4Room,
            room4CanvasSave: $scope.room4CanvasSave,
            room4VicTypes: $scope.room4VicTypes,
        };
         var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(map))
         var downloadLink = document.createElement('a')
         document.body.appendChild(downloadLink);
         downloadLink.setAttribute("href",dataStr)
         downloadLink.setAttribute("download", $scope.name + '.json')
         downloadLink.click()
         document.body.removeChild(downloadLink);
    }

    $scope.exportW = function(){
        if($scope.startNotSet()){
            Swal.fire({
                type: 'error',
                title: 'Oops...',
                text: trans['startTileError'],
            });
            return;
        }
        if($scope.area4Room.value == "Custom Room" && !room4CorrectSize()) {
            Swal.fire({
                type: 'error',
                title: 'Oops...',
                text: 'For input image for custom room 4: width:height ratio of image does not match width:height ratio of room 4 in maze'
            });
            return;
        }
        $scope.recalculateLinear();
        let w = createWorld();
        let blob = new Blob([w],{type:"text/plan"});
        let link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = $scope.name+'.wbt';
        link.click();
    }

    function checkSRCorner(walls, xPos, yPos, wallDir){
        let sr = null;
        if(xPos > -1 && xPos < $scope.width && yPos > -1 && yPos < $scope.length){
            sr = walls[yPos][xPos];
            return sr[1][wallDir] && sr[1][(wallDir+1)%4];
        }
        return false;
    }

    function checkForCorners(pos, walls){
        //Surrounding tile directions
        let around = [[0, -1], [1, 0], [0, 1], [-1, 0]];
        //Needed corners
        let corners = [false, false, false, false];

        let surroundingTiles = [];

        let thisWall = walls[pos[1]][pos[0]];

        if(!thisWall[0]) {
            corners[0] = thisWall[1][0] || thisWall[1][1] || checkSRCorner(walls, pos[0] + 1, pos[1] - 1, 2);
            corners[1] = thisWall[1][1] || thisWall[1][2] || checkSRCorner(walls, pos[0] + 1, pos[1] + 1, 3);
            corners[2] = thisWall[1][2] || thisWall[1][3] || checkSRCorner(walls, pos[0] - 1, pos[1] + 1, 0);
            corners[3] = thisWall[1][3] || thisWall[1][0] || checkSRCorner(walls, pos[0] - 1, pos[1] - 1, 1);
            return corners;
        }

        //For each surrounding card
        for(let a of around){
            //Get the position
            let xPos = pos[0] + a[0]
            let yPos = pos[1] + a[1]
            //If it is a valid position
            if(xPos > -1 && xPos < $scope.width && yPos > -1 && yPos < $scope.length){
                //Add the tile to the surrounding list
                surroundingTiles.push(walls[yPos][xPos]);
            }else{
                //Otherwise add a null value
                surroundingTiles.push([false, [false, false, false, false], false, false, false]);
            }
        }

        //If top right is needed
        corners[0] = surroundingTiles[0][1][1] && surroundingTiles[1][1][0] && !thisWall[1][0] && !thisWall[1][1];
        //If bottom right is needed
        corners[1] = surroundingTiles[1][1][2] && surroundingTiles[2][1][1] && !thisWall[1][1] && !thisWall[1][2];
        //If bottom left is needed
        corners[2] = surroundingTiles[2][1][3] && surroundingTiles[3][1][2] && !thisWall[1][2] && !thisWall[1][3];
        //If top left is needed
        corners[3] = surroundingTiles[0][1][3] && surroundingTiles[3][1][0] && !thisWall[1][3] && !thisWall[1][0];

        return corners;
    }

    function checkForExternalWalls(pos, walls){
        let thisWall = walls[pos[1]][pos[0]];
        if(!thisWall[0]) return [false, false, false, false];

        //Surrounding tiles
        let around = [[0, -1], [1, 0], [0, 1], [-1, 0]];
        let otherTiles = [false, false, false, false];

        let d = 0;

        for(let a of around){
            //Get the tiles position
            let xPos = pos[0] + a[0];
            let yPos = pos[1] + a[1];
            //If it is a valid positon
            if(xPos > -1 && xPos < $scope.width && yPos > -1 && yPos < $scope.length){
                //Add the tiles present data
                if(!walls[yPos][xPos][0]) otherTiles[d] = false;
                else otherTiles[d] = true;
            }else{
                //No tile present
                otherTiles[d] = false;
            }

            //Add one to direction counter
            d = d + 1
        }
        //Convert to needed walls
        externalsNeeded = [!otherTiles[0], !otherTiles[1], !otherTiles[2], !otherTiles[3]]
        return externalsNeeded
    }

    function checkForNotch (pos, walls){
        //Variables to store if each notch is needed
        let needLeft = false;
        let needRight = false;

        //No notches needed if there is not a floor
        if(!walls[pos[1]][pos[0]][0]) return [false, false, 0];

        let rotations = [3.14159, 1.57079, 0, -1.57079];

        //Surrounding tiles
        let around = [[0, -1], [1, 0], [0, 1], [-1, 0]];
        //Tiles to check if notches are needed
        let notchAround = [[ [1, -1], [-1, -1] ],
                            [ [1, 1], [1, -1] ],
                            [ [-1, 1], [1, 1] ],
                            [ [-1, -1], [-1, 1] ]];

        //Current direction
        let d = 0;
        //Number of surrounding tiles
        let surround = 0;

        //Direction of present tile
        let dire = -1;

        //Iterate for surrounding tiles
        for(a of around){
            //If x axis is within array
            if(pos[0] + a[0] < $scope.width && pos[0] + a[0] > -1){
                //If y axis is within array
                if(pos[1] + a[1] < $scope.length && pos[1] + a[1] > -1){
                    //If there is a tile there
                    if(walls[pos[1] + a[1]][pos[0] + a[0]][0]){
                        //Add to number of surrounding tiles
                        surround = surround + 1
                        //Store direction
                        dire = d
                    }
                }
            }
            //Increment direction
            d = d + 1
        }

        let rotation = 0
        //If there was only one connected tile and there is a valid stored direction
        if(surround == 1 && dire > -1 && dire < notchAround.length){
            //Get the left and right tile positions to check
            let targetLeft = [pos[0] + notchAround[dire][0][0], pos[1] + notchAround[dire][0][1]];
            let targetRight = [pos[0] + notchAround[dire][1][0], pos[1] + notchAround[dire][1][1]];

            //If the left tile is a valid target position
            if(targetLeft[0] < $scope.width && targetLeft[0] > -1 && targetLeft[1] < $scope.length && targetLeft[1] > -1){
                //If there is no tile there
                if(!walls[targetLeft[1]][targetLeft[0]][0]){
                    //A left notch is needed
                    needLeft = true;
                }
            }

            //If the right tile is a valid target position
            if(targetRight[0] < $scope.width && targetRight[0] > -1 && targetRight[1] < $scope.length && targetRight[1] > -1){
                //If there is no tile there
                if(!walls[targetRight[1]][targetRight[0]][0]){
                    //A right notch is needed
                    needRight = true;
                }
            }

            rotation = rotations[dire];
        }

        //Return information about needed notches
        return [needLeft, needRight, rotation]
    }

    function u2f(v){
        if(v) return true;
        return false;
    }

    function getRandomArbitrary(min, max) {
        return Math.random() * (max - min) + min;
    }

    function orgRound(value, base) {
        return Math.round(value / base) * base;
    }

    function createWorld(){
        let walls = [];
        for(let x=1,l=$scope.length*2+1;x<l;x+=2){
            let row = [];
            for(let z=1,m=$scope.width*2+1;z<m;z+=2){
                row.push([false, [0, 0, 0, 0], false, false, false, false, 0, 0, false, false,'', '', '', [], '', 0]);
            }
            walls.push(row);
        }
        for(let y=1,l=$scope.length*2+1;y<l;y+=2){
            for(let x=1,m=$scope.width*2+1;x<m;x+=2){

                let thisCell = $scope.cells[x+','+y+',0'];
                let arWall = [0, 0, 0, 0];
                let arWallHalf = [0, 0, 0, 0];
                if($scope.cells[(x)+','+(y-2)+',0'] == null && $scope.cells[(x)+','+(y-1)+',0'] && $scope.cells[(x)+','+(y-1)+',0'].isWall) arWall[0] = 1;
                if($scope.cells[(x+1)+','+(y)+',0'] && $scope.cells[(x+1)+','+(y)+',0'].isWall) arWall[1] = 1;
                if($scope.cells[(x)+','+(y+1)+',0'] && $scope.cells[(x)+','+(y+1)+',0'].isWall) arWall[2] = 1;
                if($scope.cells[(x-2)+','+(y)+',0'] == null && $scope.cells[(x - 1)+','+(y)+',0'] && $scope.cells[(x-1)+','+(y)+',0'].isWall) arWall[3] = 1;

                if($scope.cells[(x)+','+(y-1)+',0'] && y == 1 && $scope.cells[(x)+','+(y-1)+',0'].halfWall > 0) {
                    $scope.cells[(x)+','+(y)+',0'].tile.halfTile = 1;
                    arWallHalf[0] = $scope.cells[(x)+','+(y-1)+',0'].halfWall;
                }
                if($scope.cells[(x+1)+','+(y)+',0'] && $scope.cells[(x+1)+','+(y)+',0'].halfWall > 0) {
                    $scope.cells[(x)+','+(y)+',0'].tile.halfTile = 1;
                    arWallHalf[1] = $scope.cells[(x+1)+','+(y)+',0'].halfWall;
                }
                if($scope.cells[(x)+','+(y+1)+',0'] && $scope.cells[(x)+','+(y+1)+',0'].halfWall > 0) {
                    $scope.cells[(x)+','+(y)+',0'].tile.halfTile = 1;
                    arWallHalf[2] = $scope.cells[(x)+','+(y+1)+',0'].halfWall;
                }
                if($scope.cells[(x-1)+','+(y)+',0'] && x == 1 && $scope.cells[(x-1)+','+(y)+',0'].halfWall > 0) {
                    $scope.cells[(x)+','+(y)+',0'].tile.halfTile = 1;
                    arWallHalf[3] = $scope.cells[(x-1)+','+(y)+',0'].halfWall;
                }

                let humanType = 0; // 1 - harmed, 2 - unharmed, 3 - stable, 4 - thermal
                let humanPlace = 0;
                let roomNum = 1;
                let floorColor = '0.635 0.635 0.635';
                let halfWallOutVar = [0, 0, 0, 0];
                let halfWallInVar = [0, 0, 0, 0];
                let curveWallVar = [0, 0, 0, 0];
                //stores shortening, lengthing of outer half walls
                let halfWallOutInfo = [1, 1, 1, 1];
                if(!thisCell){
                    continue;
                }
                if(thisCell.tile && thisCell.tile.victims){
                    if(thisCell.tile.victims.top){
                        switch(thisCell.tile.victims.top){
                            case 'None':
                                break;
                            case 'H':
                                humanType = 1;
                                humanPlace = 0;
                                break;
                            case 'S':
                                humanType = 3;
                                humanPlace = 0;
                                break;
                            case 'U':
                                humanType = 2;
                                humanPlace = 0;
                                break;
                            case 'F':
                                humanType = 5;
                                humanPlace = 0;
                                break;
                            case 'P':
                                humanType = 6;
                                humanPlace = 0;
                                break;
                            case 'C':
                                humanType = 7;
                                humanPlace = 0;
                                break;
                            case 'O':
                                humanType = 8;
                                humanPlace = 0;
                                break;
                        }

                    }else if(thisCell.tile.victims.right){
                        switch(thisCell.tile.victims.right){
                            case 'None':
                                break;
                            case 'H':
                                humanType = 1;
                                humanPlace = 1;
                                break;
                            case 'S':
                                humanType = 3;
                                humanPlace = 1;
                                break;
                            case 'U':
                                humanType = 2;
                                humanPlace = 1;
                                break;
                            case 'F':
                                humanType = 5;
                                humanPlace = 1;
                                break;
                            case 'P':
                                humanType = 6;
                                humanPlace = 1;
                                break;
                            case 'C':
                                humanType = 7;
                                humanPlace = 1;
                                break;
                            case 'O':
                                humanType = 8;
                                humanPlace = 1;
                                break;
                        }
                    }else if(thisCell.tile.victims.bottom){
                        switch(thisCell.tile.victims.bottom){
                            case 'None':
                                break;
                            case 'H':
                                humanType = 1;
                                humanPlace = 2;
                                break;
                            case 'S':
                                humanType = 3;
                                humanPlace = 2;
                                break;
                            case 'U':
                                humanType = 2;
                                humanPlace = 2;
                                break;
                            case 'F':
                                humanType = 5;
                                humanPlace = 2;
                                break;
                            case 'P':
                                humanType = 6;
                                humanPlace = 2;
                                break;
                            case 'C':
                                humanType = 7;
                                humanPlace = 2;
                                break;
                            case 'O':
                                humanType = 8;
                                humanPlace = 2;
                                break;

                        }
                    }else if(thisCell.tile.victims.left){
                        switch(thisCell.tile.victims.left){
                            case 'None':
                                break;
                            case 'H':
                                humanType = 1;
                                humanPlace = 3;
                                break;
                            case 'S':
                                humanType = 3;
                                humanPlace = 3;
                                break;
                            case 'U':
                                humanType = 2;
                                humanPlace = 3;
                                break;
                            case 'F':
                                humanType = 5;
                                humanPlace = 3;
                                break;
                            case 'P':
                                humanType = 6;
                                humanPlace = 3;
                                break;
                            case 'C':
                                humanType = 7;
                                humanPlace = 3;
                                break;
                            case 'O':
                                humanType = 8;
                                humanPlace = 3;
                                break;
                        }
                    }
                }
                if (thisCell.tile && thisCell.tile.color) {
                    floorColor = '';
                    if (thisCell.tile.color == '#08D508') // area 1 <-> 4
                        $scope.connect14 = [x, y];
                    else if (thisCell.tile.color == '#e71a1a') // area 3 <-> 4
                        $scope.connect34 = [x, y]
                    for (i = 1; i < 7; i += 2)
                        floorColor += String(parseInt('0x' + thisCell.tile.color.substring(i, i + 2)) / 255.0) + ' ';
                }
                if (thisCell.tile) {
                    halfWallOutVar = arWallHalf;
                    halfWallInVar = thisCell.tile.halfWallIn;
                    curveWallVar = '[' + thisCell.tile.curve.toString() + ']';
                }
                roomNum = checkRoomNumber(x,y,0)
                if(thisCell.tile){
                    walls[(y-1)/2][(x-1)/2] = [u2f(thisCell.reachable), arWall, u2f(thisCell.tile.checkpoint), u2f(thisCell.tile.black), x == $scope.startTile.x && y == $scope.startTile.y, u2f(thisCell.tile.swamp), humanType, humanPlace, u2f(thisCell.isLinear), u2f(thisCell.tile.obstacle), halfWallOutVar, halfWallInVar, curveWallVar, thisCell.tile.halfWallVic, floorColor, halfWallOutInfo, roomNum];
                }
            }
        }

        function vectorRotate(vector, dir) {
            if (dir == 0) // N
                return [vector[0], vector[1]]
            else if (dir == 1) // E
                return [-1 * vector[1], vector[0]]
            else if (dir == 2) // S
                return [-1 * vector[0], -1 * vector[1]]
            else if (dir == 3) // W
                return [vector[1], -1 * vector[0]]

        }

        function inBounds(z, x) {
            return (z >= 0) && (z < $scope.length) && (x >= 0) && (x < $scope.width);
        }


        let arr = [];
        //General scale for tiles - adjusts position and size of pieces and obstacles
        let tileScale = [0.4, 0.4, 0.4];
        //The vertical position of the floor
        let floorPos = -0.075 * tileScale[1];

        //Strings to hold the tile parts
        let allTiles = "";
        //Strings to hold the boundaries for special tiles
        let allCheckpointBounds = "";
        let allTrapBounds = "";
        let allGoalBounds = "";
        let allSwampBounds = "";
        let allObstacles = "";

        //
        const fileHeader = ({y, z}) => `#VRML_SIM R2022b utf8
        EXTERNPROTO "../protos/TexturedBackgroundLight.proto"
        EXTERNPROTO "../protos/TexturedBackground.proto"
        EXTERNPROTO "../protos/curvedWall.proto"
        EXTERNPROTO "../protos/halfTile.proto"
        EXTERNPROTO "../protos/HazardMap.proto"
        EXTERNPROTO "../protos/obstacle.proto"
        EXTERNPROTO "../protos/Victim.proto"
        EXTERNPROTO "../protos/worldTile.proto"
        EXTERNPROTO "../protos/Area4_1.proto"
        EXTERNPROTO "../protos/Area4_2.proto"
        IMPORTABLE EXTERNPROTO "../protos/custom_robot.proto"

        WorldInfo {
          basicTimeStep 16
          coordinateSystem "NUE"
          contactProperties [
            ContactProperties {
              material1  "TILE"
              material2  "NO_FRIC"
              coulombFriction 0
              bounce 0
              bumpSound ""
              rollSound ""
              slideSound ""
            }
          ]
        }
        DEF Viewpoint Viewpoint {
          orientation -0.683263 0.683263 0.257493 2.63756
          position -0.08 ${y} ${z}
        }
        TexturedBackground {
        }
        TexturedBackgroundLight {
        }
        `;
        const protoTilePart = ({name, x, z, fl, tw, rw, bw, lw, tex, rex, bex, lex, start, trap, checkpoint, swamp, width, height, id, xScale, yScale, zScale, color, room}) => `
        DEF ${name} worldTile {
            xPos ${x}
            zPos ${z}
            floor ${fl}
            topWall ${tw}
            rightWall ${rw}
            bottomWall ${bw}
            leftWall ${lw}
            topExternal ${tex}
            rightExternal ${rex}
            bottomExternal ${bex}
            leftExternal ${lex}
            start ${start}
            trap ${trap}
            checkpoint ${checkpoint}
            swamp ${swamp}
            width ${width}
            height ${height}
            id "${id}"
            xScale ${xScale}
            yScale ${yScale}
            zScale ${zScale}
            tileColor ${color}
            room ${room}
          }
        `;
        
        const protoHalfTilePart = ({name, x, z, fl, tw, rw, bw, lw, t1w, t2w, t3w, t4w, t1e, t2e, t3e, t4e, curve, start, trap, checkpoint, swamp, width, height, id, xScale, yScale, zScale, color, room}) => `
        DEF ${name} halfTile {
            xPos ${x}
            zPos ${z}
            floor ${fl}
            topWall ${tw}
            rightWall ${rw}
            bottomWall ${bw}
            leftWall ${lw}
            tile1Walls [ ${Number(t1w[0])}, ${Number(t1w[1])}, ${Number(t1w[2])}, ${Number(t1w[3])} ]
            tile2Walls [ ${Number(t2w[0])}, ${Number(t2w[1])}, ${Number(t2w[2])}, ${Number(t2w[3])} ]
            tile3Walls [ ${Number(t3w[0])}, ${Number(t3w[1])}, ${Number(t3w[2])}, ${Number(t3w[3])} ]
            tile4Walls [ ${Number(t4w[0])}, ${Number(t4w[1])}, ${Number(t4w[2])}, ${Number(t4w[3])} ]
            tile1External [ ${t1e[0]}, ${t1e[1]}, ${t1e[2]}, ${t1e[3]} ]
            tile2External [ ${t2e[0]}, ${t2e[1]}, ${t2e[2]}, ${t2e[3]} ]
            tile3External [ ${t3e[0]}, ${t3e[1]}, ${t3e[2]}, ${t3e[3]} ]
            tile4External [ ${t4e[0]}, ${t4e[1]}, ${t4e[2]}, ${t4e[3]} ]
            curve ${curve}
            start ${start}
            trap ${trap}
            checkpoint ${checkpoint}
            swamp ${swamp}
            width ${width}
            height ${height}
            id "${id}"
            xScale ${xScale}
            yScale ${yScale}
            zScale ${zScale}
            tileColor ${color}
            room ${room}
          }
        `;

        const boundsPart = ({name, id, xmin, zmin, xmax, zmax, y}) => `
        DEF boundary Group {
            children [
              DEF ${name}${id}min Transform {
                    translation ${xmin} ${y} ${zmin}
              }
              DEF ${name}${id}max Transform {
                    translation ${xmax} ${y} ${zmax}
              }
            ]
          }
        `;

        const area4Part = ({roomNum, x, y, rot, width, height, xScale, yScale, zScale, area4Width, area4Height}) => `
        Area4_${roomNum-1} {
            X ${x}
            Y ${y}
            DIR ${rot}
            width ${width}
            height ${height}
            xScale ${xScale}
            zScale ${zScale}
            yScale ${yScale}
            area4Width ${area4Width}
            area4Height ${area4Height}
        }
        `;

        const visualHumanPart = ({x, z, rot, id, type, score}) => `
        Victim {
            translation ${x} 0 ${z}
            rotation 0 1 0 ${rot}
            name "Victim${id}"
            type "${type}"
            scoreWorth ${score}
        }
        `;

        const hazardPart = ({x, z, rot, id, type, score}) => `
        HazardMap {
            translation ${x} 0 ${z}
            rotation 0 1 0 ${rot}
            name "Hazard${id}"
            type "${type}"
            scoreWorth ${score}
        }
        `;

        const obstaclePart = ({id, xSize, ySize, zSize, x, y, z, rot}) => `
        DEF OBSTACLE${id} Solid {
            translation ${x} ${y} ${z}
			rotation 0 1 0 ${rot}
            children [
                Shape {
                    appearance Appearance {
						material Material {
						diffuseColor 0.45 0.45 0.45
						}
                    }
                    geometry DEF OBSTACLEBOX${id} Box {
						size ${xSize} ${ySize} ${zSize}
                    }
                }
            ]
            name "obstacle${id}"
            boundingObject USE OBSTACLEBOX${id}
	    recognitionColors [
			0.45 0.45 0.45
		]
        }
        `;

        const groupPart = ({data, name}) => `
        DEF ${name} Group {
            children [
              ${data}
            ]
        }
        `;

        const supervisorPart = ({time}) => `
        DEF MAINSUPERVISOR Robot {
            children [
              Receiver {
                channel 1
              }
              Emitter {
                channel 1
              }
            ]
            supervisor TRUE
            controller "MainSupervisor"
            customData "${time}"
            window "MainSupervisorWindow"
          }
        `;

        //Upper left corner to start placing tiles from
        let width = $scope.width;
        let height = $scope.length;
        let startX = -($scope.width * (0.3 * tileScale[0]) / 2.0);
        let startZ = -($scope.length * (0.3 * tileScale[2]) / 2.0);

        let fileData = fileHeader({ y: 0.2*height, z : 0.17*height})

        //Rotations of humans for each wall
        let humanRotation = [3.14, 1.57, 0, -1.57]
        let humanRotationCurve = [2.355, 0.785, -0.785, -2.355];
        let halfWallVicPos = [[-0.075, -0.136], [-0.014, -0.075], [-0.075, -0.014], [-0.136, -0.075], 
                            [0.075, -0.136], [0.136, -0.075], [0.075, -0.014], [0.014, -0.074], 
                            [-0.075, 0.014], [-0.014, 0.075], [-0.075, 0.136], [-0.136, 0.075],
                            [0.075, 0.014], [0.136, 0.075], [0.075, 0.136], [0.014, 0.075]];
        let curveWallVicPos = [[-0.022, -0.039], [-0.022, -0.022], [-0.039, -0.023], [-0.038, -0.038],
                            [0.038, -0.039], [0.038, -0.022], [0.021, -0.023], [0.022, -0.038],
                            [-0.022, 0.021], [-0.022, 0.038], [-0.039, 0.037], [-0.038, 0.022],
                            [0.038, 0.021], [0.038, 0.038], [0.021, 0.037], [0.022, 0.022]];
        //Offsets for visual and thermal humans
        let humanOffset = [[0, -0.1375 * tileScale[2]], [0.1375 * tileScale[0], 0], [0, 0.1375 * tileScale[2]], [-0.1375 * tileScale[0], 0]]
        let humanOffsetThermal = [[0, -0.136 * tileScale[2]], [0.136 * tileScale[0], 0], [0, 0.136 * tileScale[2]], [-0.136 * tileScale[0], 0]]
        let humanOffsetCurve = [[-0.008, 0.008], [-0.008, -0.008], [0.008, -0.008], [0.008, 0.008]];
        //Names of types of visual human
        let humanTypesVisual = ["harmed", "unharmed", "stable"]
        //Names of types of hazards
        let hazardTypes = ["F", "P", "C", "O"]

        //Id numbers used to give a unique but interable name to tile pieces
        let tileId = 0
        let checkId = 0
        let trapId = 0
        let goalId = 0
        let swampId = 0
        let humanId = 0
        let obstacleId = 0;
        let hazardId = 0;

        //Resolve corners
        // halfwallout 10, hallwallin 11, halfwalloutinfo 15
        for(let x = 0; x < $scope.length+1; x++) {
            for(let z = 0; z<$scope.width+1; z++) {

                let verticalWalls = 0;
                let horizontalWalls = 0;
                let topLeft = false;

                if((walls[x-1] != null && walls[x-1][z] != null && (walls[x-1][z][1][3] > 0 || walls[x-1][z][10][3] == 1)) || (walls[x-1] != null && walls[x-1][z-1] != null && (walls[x-1][z-1][1][1] > 0 || walls[x-1][z-1][10][1] == 1))) verticalWalls++; //North wall
                if((walls[x] != null && walls[x][z] != null && (walls[x][z][1][0] > 0 || walls[x][z][10][0] == 1)) || (walls[x-1] != null && walls[x-1][z] != null && (walls[x-1][z][1][2] > 0 || walls[x-1][z][10][2] == 1))) horizontalWalls++;
                if((walls[x] != null && walls[x][z] != null && (walls[x][z][1][3] > 0 || walls[x][z][10][3] == 2)) || (walls[x] != null && walls[x][z-1] != null && (walls[x][z-1][1][1] > 0 || walls[x][z-1][10][1] == 2))) verticalWalls++;
                if((walls[x-1] != null && walls[x-1][z-1] != null && (walls[x-1][z-1][1][2] > 0 || walls[x-1][z-1][10][2] == 2)) || (walls[x] != null && walls[x][z-1] != null && (walls[x][z-1][1][0] > 0 || walls[x][z-1][10][0] == 2))) horizontalWalls++;

                //Very special case for top left corner
                if((walls[x] != null && walls[x][z] != null && (walls[x][z][1][0] > 0 || walls[x][z][10][0] == 1)) || (walls[x] != null && walls[x][z] != null && (walls[x][z][1][3] > 0 || walls[x][z][10][3] == 2))) topLeft = true;


                if(horizontalWalls > 0 && verticalWalls > 0) {

                    //North wall
                    if((walls[x-1] != null && walls[x-1][z] && walls[x-1][z][1][3] > 0)) walls[x-1][z][1][3] = (walls[x-1][z][1][3]) * 3;
                    else if(walls[x-1] != null && walls[x-1][z-1] && walls[x-1][z-1][1][1] > 0) walls[x-1][z-1][1][1] = (walls[x-1][z-1][1][1]) * 3;
                    else if((walls[x-1] != null && walls[x-1][z] && walls[x-1][z][10][3] == 1)) walls[x-1][z][15][3] *= 3;
                    else if(walls[x-1] != null && walls[x-1][z-1] && walls[x-1][z-1][10][1] == 1) walls[x-1][z-1][15][1] *= 3;
                    

                    if((walls[x-1] != null && walls[x-1][z] && walls[x-1][z][1][2] > 0)) walls[x-1][z][1][2] = (walls[x-1][z][1][2]) * horizontalWalls == 1 ? 5 : 2;
                    else if(walls[x] != null && walls[x][z] && walls[x][z][1][0] > 0) walls[x][z][1][0] = (walls[x][z][1][0]) * 2;
                    else if((walls[x-1] != null && walls[x-1][z] && walls[x-1][z][10][2] == 1)) walls[x-1][z][15][2] *= horizontalWalls == 1 ? 5 : 2;
                    else if(walls[x] != null && walls[x][z] && walls[x][z][10][0] == 1) walls[x][z][15][0] *= 2;

                    if((walls[x] != null && walls[x][z-1] && walls[x][z-1][1][1] > 0)) walls[x][z-1][1][1] = (walls[x][z-1][1][1]) * 2;
                    else if(walls[x] != null && walls[x][z] && walls[x][z][1][3] > 0) walls[x][z][1][3] = (walls[x][z][1][3]) * 2;
                    else if((walls[x] != null && walls[x][z-1] && walls[x][z-1][10][1] == 2)) walls[x][z-1][15][1] *= 2; 
                    else if(walls[x] != null && walls[x][z] && walls[x][z][10][3] == 2) walls[x][z][15][3] *= 2; 

                    if((walls[x] != null && walls[x][z-1] && walls[x][z-1][1][0] > 0)) walls[x][z-1][1][0] = (walls[x][z-1][1][0]) * 3;
                    else if(walls[x-1] != null && walls[x-1][z-1] && walls[x-1][z-1][1][2] > 0) walls[x-1][z-1][1][2] = (walls[x-1][z-1][1][2]) * 3;
                    else if((walls[x] != null && walls[x][z-1] && walls[x][z-1][10][0] == 2)) walls[x][z-1][15][0] *= 3; 
                    else if(walls[x-1] != null && walls[x-1][z-1] && walls[x-1][z-1][10][2] == 2) walls[x-1][z-1][15][2] *= 3; 

                    if(topLeft && horizontalWalls == 1 && verticalWalls == 1) {
                        // If the left and top walls are the only horizontal and vertical walls

                        walls[x][z][1][0] /= 2;
                        walls[x][z][1][3] /= 2;
                        if(walls[x][z][10][0] == 1) walls[x][z][15][0] /= 2;
                        if (walls[x][z][10][3] == 1) walls[x][z][15][3] /= 2;
                    }
                }
               
                //inner half tile walls along horizontal edge of 2 different tiles
                horizontalWalls = 0;
                verticalWalls = 0;
                if(walls[x] != null && walls[x][z] != null && walls[x][z][11][0] > 0) verticalWalls++;
                if(walls[x-1] != null && walls[x-1][z] != null && walls[x-1][z][11][2] > 0) verticalWalls++;
                if(walls[x] != null && walls[x][z] != null && walls[x][z][10][0] > 0) horizontalWalls++;
                if(walls[x-1] != null && walls[x-1][z] != null && walls[x-1][z][10][2] > 0) horizontalWalls++;
                if(horizontalWalls > 0 && verticalWalls > 0) {

                    if(walls[x] != null && walls[x][z] != null && walls[x][z][11][0] > 0) walls[x][z][11][0] *= 2;
                    if(walls[x-1] != null && walls[x-1][z] != null && walls[x-1][z][11][2] > 0) walls[x-1][z][11][2] *= 3;

                    if(walls[x] != null && walls[x][z] != null && walls[x][z][10][0] == 1) walls[x][z][15][0] *= 3;
                    else if(walls[x] != null && walls[x][z] != null && walls[x][z][10][0] == 2) walls[x][z][15][0] *= horizontalWalls == 1 ? 5 : 2;

                    if(walls[x-1] != null && walls[x-1][z] != null && walls[x-1][z][10][2] == 1) walls[x-1][z][15][2] *= 2;
                    else if(walls[x-1] != null && walls[x-1][z] != null && walls[x-1][z][10][2] == 2) walls[x-1][z][15][2] *= horizontalWalls == 1 ? 5 : 2;
                }


                horizontalWalls = 0;
                verticalWalls = 0;

                //inner half tile walls in center
                if(walls[x] != null && walls[x][z] != null) {
                    if(walls[x][z][11][0] > 0) verticalWalls++;
                    if(walls[x][z][11][1] > 0) horizontalWalls++;
                    if(walls[x][z][11][2] > 0) verticalWalls++;
                    if(walls[x][z][11][3] > 0) horizontalWalls++;

                    if(verticalWalls > 0 && horizontalWalls > 0) {
                        walls[x][z][11][0] *= 3;
                        walls[x][z][11][1] *= horizontalWalls == 1 ? 5 : 2;
                        walls[x][z][11][2] *= 2;
                        walls[x][z][11][3] *= 3;
                    }
                }

                horizontalWalls = 0;
                verticalWalls = 0;
                //inner half tile walls along vertical edge of 2 different tiles
                if((walls[x] != null && (walls[x][z] != null && walls[x][z][10][3] > 0)) || (walls[x] != null && walls[x][z-1] != null && walls[x][z-1][10][1] > 0)) verticalWalls++;
                if(walls[x] != null && walls[x][z] != null && walls[x][z][11][3] > 0) horizontalWalls++;
                if(walls[x] != null && walls[x][z-1] != null && walls[x][z-1][11][1] > 0) horizontalWalls++;

                if(verticalWalls > 0 && horizontalWalls > 0) {
                    if(walls[x] != null && walls[x][z] != null && walls[x][z][10][3] == 2) walls[x][z][15][3] *= 3;
                    else if(walls[x] != null && walls[x][z] != null && walls[x][z][10][3] == 1) walls[x][z][15][3] *= 2;

                    if(walls[x] != null && walls[x][z-1] != null && walls[x][z-1][10][1] == 2) walls[x][z-1][15][1] *= 3;
                    else if(walls[x] != null && walls[x][z-1] != null && walls[x][z-1][10][1] == 1) walls[x][z-1][15][1] *= 2;

                    if(walls[x] != null && walls[x][z] != null && walls[x][z][11][3] > 0) walls[x][z][11][3] *= horizontalWalls == 1 ? 5 : 2;

                    if(walls[x] != null && walls[x][z-1] != null && walls[x][z-1][11][1] > 0) walls[x][z-1][11][1] *= 3;

                }

            }
        }

        //String to hold all the humans/hazards
        let allHumans = ""
        let allHazards = ""
        for(let x=0;x<$scope.width;x++){
            for(let z=0;z<$scope.length;z++){
                //Check which corners and external walls and notches are needed
                let externals = checkForExternalWalls([x, z], walls)
                //Name to be given to the tile
                let tileName = "TILE"
                if(walls[z][x][4]) tileName = "START_TILE"
                //Create a new tile with all the data
                if ($scope.cells[String(x * 2 + 1) + "," + String(z * 2 + 1) + ",0"].tile.halfTile) {

                    let t1w = [walls[z][x][10][0] == 1 ? walls[z][x][15][0] : 0, walls[z][x][11][0], walls[z][x][11][3], walls[z][x][10][3] == 2 ? walls[z][x][15][3] : 0];
                    let t2w = [walls[z][x][10][0] == 2 ? walls[z][x][15][0] : 0, walls[z][x][10][1] == 2 ? walls[z][x][15][1] : 0, walls[z][x][11][1], 0]; 
                    let t3w = [0, walls[z][x][11][2], walls[z][x][10][2] == 1 ? walls[z][x][15][2] : 0, walls[z][x][10][3] == 1 ? walls[z][x][15][3] : 0];
                    let t4w = [0, walls[z][x][10][1] == 1 ? walls[z][x][15][1] : 0, walls[z][x][10][2] == 2 ? walls[z][x][15][2] : 0, 0];
                    console.log("b", walls[z][x][10]);
                    
                    let t1e = [externals[0], false, false, externals[3]];
                    let t2e = [externals[0], externals[1], false, false];
                    let t3e = [false, false, externals[2], externals[3]];
                    let t4e = [false, externals[1], externals[2], false];

                    tile = protoHalfTilePart({name: tileName, x: x, z: z, fl: walls[z][x][0] && !walls[z][x][3], tw: walls[z][x][1][0], rw: walls[z][x][1][1], bw: walls[z][x][1][2], lw: walls[z][x][1][3], t1w: t1w, t2w: t2w, t3w: t3w, t4w: t4w, t1e: t1e, t2e: t2e, t3e: t3e, t4e: t4e, curve: walls[z][x][12], start: walls[z][x][4], trap: walls[z][x][3], checkpoint: walls[z][x][2], swamp: walls[z][x][5], width: width, height: height, id: tileId, xScale: tileScale[0], yScale: tileScale[1], zScale: tileScale[2], color: walls[z][x][14], room: walls[z][x][16]});
                    tile = tile.replace(/true/g, "TRUE")
                    tile = tile.replace(/false/g, "FALSE")
                }
                else {
                    tile = protoTilePart({name: tileName, x: x, z: z, fl: walls[z][x][0] && !walls[z][x][3], tw: walls[z][x][1][0], rw: walls[z][x][1][1], bw: walls[z][x][1][2], lw: walls[z][x][1][3], tex: externals[0], rex: externals[1], bex: externals[2], lex: externals[3], start: walls[z][x][4], trap: walls[z][x][3], checkpoint: walls[z][x][2], swamp: walls[z][x][5], width: width, height: height, id: tileId, xScale: tileScale[0], yScale: tileScale[1], zScale: tileScale[2], color: walls[z][x][14], room: walls[z][x][16]});
                    tile = tile.replace(/true/g, "TRUE")
                    tile = tile.replace(/false/g, "FALSE")
                }
                allTiles = allTiles + tile
                //checkpoint
                if(walls[z][x][2]){
                    //Add bounds to the checkpoint boundaries
                    allCheckpointBounds += boundsPart({name: "checkpoint", id: checkId, xmin: (x * 0.3 * tileScale[0] + startX) - (0.15 * tileScale[0]), zmin: (z * 0.3 * tileScale[2] + startZ) - (0.15 * tileScale[2]), xmax: (x * 0.3 * tileScale[0] + startX) + (0.15 * tileScale[0]), zmax: (z * 0.3 * tileScale[2] + startZ) + (0.15 * tileScale[2]), y: floorPos});
                    //Increment id counter
                    checkId = checkId + 1
                }
                //trap
                if(walls[z][x][3]){
                    //Add bounds to the trap boundaries
                    allTrapBounds += boundsPart({name: "trap", id: trapId, xmin: (x * 0.3 * tileScale[0] + startX) - (0.15 * tileScale[0]), zmin: (z * 0.3 * tileScale[2] + startZ) - (0.15 * tileScale[2]), xmax: (x * 0.3 * tileScale[0] + startX) + (0.15 * tileScale[0]), zmax: (z * 0.3 * tileScale[2] + startZ) + (0.15 * tileScale[2]), y: floorPos});
                    //Increment id counter
                    trapId = trapId + 1
                }
                //goal
                if(walls[z][x][4]){
                    //Add bounds to the goal boundaries
                    allGoalBounds += boundsPart({name: "start", id: goalId, xmin: (x * 0.3 * tileScale[0] + startX) - (0.15 * tileScale[0]), zmin: (z * 0.3 * tileScale[2] + startZ) - (0.15 * tileScale[2]), xmax: (x * 0.3 * tileScale[0] + startX) + (0.15 * tileScale[0]), zmax: (z * 0.3 * tileScale[2] + startZ) + (0.15 * tileScale[2]), y: floorPos});
                    //Increment id counter
                    goalId = goalId + 1
                }
                //swamp
                if(walls[z][x][5]){
                    //Add bounds to the goal boundaries
                    allSwampBounds += boundsPart({name: "swamp", id: swampId, xmin: (x * 0.3 * tileScale[0] + startX) - (0.15 * tileScale[0]), zmin: (z * 0.3 * tileScale[2] + startZ) - (0.15 * tileScale[2]), xmax: (x * 0.3 * tileScale[0] + startX) + (0.15 * tileScale[0]), zmax: (z * 0.3 * tileScale[2] + startZ) + (0.15 * tileScale[2]), y: floorPos});
                    //Increment id counter
                    swampId = swampId + 1
                }
                //Increment id counter
                tileId = tileId + 1

                //Human
                if(walls[z][x][6] != 0){
                    //Position of tile
                    let humanPos = [(x * 0.3 * tileScale[0]) + startX , (z * 0.3 * tileScale[2]) + startZ]
                    let humanRot = humanRotation[walls[z][x][7]]
                    //Randomly move human left and right on wall
                    let randomOffset = [0, 0]
                    if ((inBounds(z-1, x) && walls[z-1][x][6] == 0) &&  // ensure no adjacent tile victims (random offset can place too close)
                        (inBounds(z+1, x) && walls[z+1][x][6] == 0) && 
                        (inBounds(z, x-1) && walls[z][x-1][6] == 0) && 
                        (inBounds(z, x+1) && walls[z][x+1][6] == 0)) {
                        if(walls[z][x][7] == 0 || walls[z][x][7] == 2){
                            //X offset for top and bottom
                            randomOffset = [orgRound(getRandomArbitrary(-0.1 * tileScale[0], 0.1 * tileScale[0]), 0.001), 0]
                        }else{
                            //Z offset for left and right
                            randomOffset = [0, orgRound(getRandomArbitrary(-0.1 * tileScale[2], 0.1 * tileScale[2]), 0.001)]
                        }
                    }

                    if (walls[z][x][6] >= 5 && walls[z][x][6] <= 8){ //hazards
                        humanPos[0] = humanPos[0] + humanOffsetThermal[walls[z][x][7]][0] + randomOffset[0]
                        humanPos[1] = humanPos[1] + humanOffsetThermal[walls[z][x][7]][1] + randomOffset[1]
                        let score = 30
                        if(walls[z][x][8]) score = 10
                        allHazards = allHazards + hazardPart({x: humanPos[0], z: humanPos[1], rot: humanRot, id: hazardId, type: hazardTypes[walls[z][x][6] - 5], score: score})
                        hazardId = hazardId + 1
                    }else{ //humans
                        humanPos[0] = humanPos[0] + humanOffset[walls[z][x][7]][0] + randomOffset[0]
                        humanPos[1] = humanPos[1] + humanOffset[walls[z][x][7]][1] + randomOffset[1]
                        let score = 15
                        if(walls[z][x][8]) score = 5
                        allHumans = allHumans + visualHumanPart({x: humanPos[0], z: humanPos[1], rot: humanRot, id: humanId, type: humanTypesVisual[walls[z][x][6] - 1], score: score})
                        humanId = humanId + 1
                    }
                }
                if(walls[z][x][13]){
                    for (var i in $scope.range(16)) {
                        if (walls[z][x][13][i]) {
                            let humanType = Number(walls[z][x][13][i]);
                            let humanPos = [(x * 0.3 * tileScale[0]) + startX , (z * 0.3 * tileScale[2]) + startZ]
                            let score = 30
                            let j = 0
                            if(walls[z][x][8]) score = 10
                            //Curved Wall Humans
                            let curveWallArr = JSON.parse(walls[z][x][12]);
                            if (curveWallArr[parseInt(i / 4)]) {
                                let curveDir = curveWallArr[parseInt(i / 4)] - 1;
                                let inside = 0;
                                let ind = parseInt(i / 4) * 4 + curveDir;
                                // if victim is on inside or outside of curve
                                if (!(curveDir == (parseInt(i) + 2) % 4 || curveDir == (parseInt(i) + 1) % 4)) {
                                    console.log("outside");
                                    inside = 1;
                                    curveDir = (curveDir + 2) % 4;
                                }
                                else {
                                    console.log("inside");
                                }
                                if (humanType >= 0 && humanType <= 3) {
                                    console.log("HP: " + humanPos);
                                    console.log("Curve Offset: " + curveWallVicPos[ind] + " " + ind + " " + i);
                                    console.log("Curvedir: " + curveDir);
                                    console.log("Inside: " + inside);
                                    console.log("In/Out X: " + humanOffsetCurve[curveDir][0] * inside);
                                    console.log("In/Out Z: " + humanOffsetCurve[curveDir][1] * inside);
                                    console.log("X: " + humanPos[0] + curveWallVicPos[ind][0] + humanOffsetCurve[curveDir][0] * inside);
                                    console.log("Z: " + humanPos[1] + curveWallVicPos[ind][1] + humanOffsetCurve[curveDir][1] * inside);
                                    score = score / 2;
                                    //allHumans = allHumans + visualHumanPart({x: humanPos[0], z: humanPos[1], rot: humanRotationCurve[curveDir], id: humanId, type: humanTypesVisual[walls[z][x][13][i] - 1], score: score})
                                    allHumans = allHumans + visualHumanPart({x: humanPos[0] + curveWallVicPos[ind][0] + humanOffsetCurve[curveDir][0] * inside, z: humanPos[1] + curveWallVicPos[ind][1] + humanOffsetCurve[curveDir][1] * inside, rot: humanRotationCurve[curveDir], id: humanId, type: humanTypesVisual[walls[z][x][13][i] - 1], score: score})
                                    humanId = humanId + 1
                                }
                                else if (humanType>= 5 && humanType <= 8) {
                                    allHazards = allHazards + hazardPart({x: humanPos[0] + curveWallVicPos[ind][0] + humanOffsetCurve[curveDir][0] * inside, z: humanPos[1] + curveWallVicPos[ind][1] + humanOffsetCurve[curveDir][1] * inside, rot: humanRotationCurve[curveDir], id: hazardId, type: hazardTypes[walls[z][x][13][i] - 5], score: score})
                                    hazardId = hazardId + 1
                                }
                            }
                            //Half Wall Humans
                            else {
                                if (humanType >= 0 && humanType <= 3) {
                                    score = score / 2;
                                    allHumans = allHumans + visualHumanPart({x: humanPos[0] + halfWallVicPos[i][0] * tileScale[0], z: humanPos[1] + halfWallVicPos[i][1] * tileScale[2], rot: humanRotation[i % 4], id: humanId, type: humanTypesVisual[walls[z][x][13][i] - 1], score: score})
                                    humanId = humanId + 1
                                }
                                else if (humanType>= 5 && humanType <= 8) {
                                    allHazards = allHazards + hazardPart({x: humanPos[0] + halfWallVicPos[i][0] * tileScale[0], z: humanPos[1] + halfWallVicPos[i][1] * tileScale[2], rot: humanRotation[i % 4], id: hazardId, type: hazardTypes[walls[z][x][13][i] - 5], score: score})
                                    hazardId = hazardId + 1
                                }
                            }
                        }
                    }
                }
                //Obstacle
                if(walls[z][x][9] != 0){
                    //Default height for static obstacle
                    let height = 0.15

                    //Default size contstraints for static obstacle
                    let minSize = 5
                    let maxSize = 15

                    //Generate random size
                    let width = getRandomArbitrary(minSize, maxSize) / 100.0
                    let depth = getRandomArbitrary(minSize, maxSize) / 100.0

                    //Calculate radius of obstacle
                    let r = (((width / 2.0) ** 2) + ((depth / 2.0) ** 2)) ** 0.50

                    //Boundaries of tile to pick
                    console.log(r)
                    let xBounds = [-0.1 + r, 0.1 - r]
                    let zBounds = [-0.1 + r, 0.1 - r]

                    //Get the centre position of the tile
                    let tPos = [(x * 0.3 * tileScale[0]) + startX , (z * 0.3 * tileScale[2]) + startZ]

                    //Get a random position
                    let pos = [orgRound(getRandomArbitrary(xBounds[0], xBounds[1]), 0.00001), orgRound(getRandomArbitrary(zBounds[0], zBounds[1]), 0.00001)]
                    //Offset with tile position
                    pos[0] = pos[0] + tPos[0]
                    pos[1] = pos[1] + tPos[1]

                    //Random rotation for obstacle
                    let rot = orgRound(getRandomArbitrary(0.00, 6.28), 0.001)

                    allObstacles += obstaclePart({id: obstacleId, xSize: width * tileScale[0], ySize: height * tileScale[1], zSize: depth * tileScale[2], x: pos[0], y: 0 , z: pos[1], rot: rot})
                    //Increment id counter
                    obstacleId = obstacleId + 1

                }
            }
        }

        // area 4 positioning
        if ($scope.area4Room.value == "Custom Room") {
            allTiles = allTiles + createArea4Solid();
            let scoringElements = createArea4Victims(humanId, hazardId);
            allHumans += scoringElements[0];
            allHazards += scoringElements[1];
        }
        else {
            N = 0
            E = 1
            S = 2
            W = 3
            room4 = $scope.area4[$scope.area4Room.type]
            if ($scope.area4Room.type != 0 && $scope.connect14 && $scope.connect34) {
                connect14 = [($scope.connect14[0] - 1) / 2, ($scope.connect14[1] - 1) / 2]
                connect34 = [($scope.connect34[0] - 1) / 2, ($scope.connect34[1] - 1) / 2]
                area4X = 0
                area4Y = 0
                area4Rot = 0

                area4X = connect14[0]
                area4Y = connect14[1]
                if (connect34[0] - connect14[0] == room4.room3Tile[0] - room4.room1Tile[0] &&
                    connect34[1] - connect14[1] == room4.room3Tile[1] - room4.room1Tile[1])
                    area4Rot = N
                else if (connect14[0] - connect34[0] == room4.room3Tile[1] - room4.room1Tile[1] &&
                    connect34[1] - connect14[1] == room4.room3Tile[0] - room4.room1Tile[0])
                    area4Rot = E
                else if (connect14[0] - connect34[0] == room4.room3Tile[0] - room4.room1Tile[0] &&
                    connect14[1] - connect34[1] == room4.room3Tile[1] - room4.room1Tile[1])
                    area4Rot = S
                else if (connect34[0] - connect14[0] == room4.room3Tile[1] - room4.room1Tile[1] &&
                    connect14[1] - connect34[1] == room4.room3Tile[0] - room4.room1Tile[0])
                    area4Rot = W
                startTrans = vectorRotate(room4.room1Tile, area4Rot)
                area4X -= startTrans[0]
                area4Y -= startTrans[1]
                allTiles = allTiles + area4Part({roomNum: $scope.area4Room.type, x: area4X, y: area4Y, rot: area4Rot, width: width, height: height, xScale: tileScale[0], yScale: tileScale[1], zScale: tileScale[2], area4Width: room4.width, area4Height: room4.height})

                area4Width = room4.width
                area4Height = room4.height
                if (area4Rot == E || area4Rot == W) {
                    area4Width = room4.height
                    area4Height = room4.width
                }
                xOffset = -(width * 0.3 * tileScale[0] / 2.0) + area4X * 0.3 * tileScale[0]
                zOffset = -(height * 0.3 * tileScale[1] / 2.0) + area4Y * 0.3 * tileScale[1]
                area4Humans = room4.humans
                for (i = 0; i < area4Humans.length; i++) {
                    vicPosTrans = vectorRotate([area4Humans[i].x, area4Humans[i].z], area4Rot)
                    thisHuman = {
                        x: vicPosTrans[0] + xOffset,
                        z: vicPosTrans[1] + zOffset,
                        rot: area4Humans[i].rot + area4Rot * -1.57,
                        id: humanId,
                        type: area4Humans[i].type,
                        score: area4Humans[i].score,
                    }
                    allHumans += visualHumanPart(thisHuman)
                    humanId += 1
                }
                area4Hazards = room4.hazards
                for (i = 0; i < area4Hazards.length; i++) {
                    hazPosTrans = vectorRotate([area4Hazards[i].x, area4Hazards[i].z], area4Rot)
                    thisHazard = {
                        x: hazPosTrans[0] + xOffset,
                        z: hazPosTrans[1] + zOffset,
                        rot: area4Hazards[i].rot + area4Rot * -1.57,
                        id: hazardId,
                        type: area4Hazards[i].type,
                        score: area4Hazards[i].score,
                    }
                    allHazards += hazardPart(thisHazard)
                    hazardId += 1
                }
            }
        }

        //Add the data pieces to the file data
        fileData = fileData + groupPart({data: allTiles, name: "WALLTILES"})
        fileData = fileData + groupPart({data: allCheckpointBounds, name: "CHECKPOINTBOUNDS"})
        fileData = fileData + groupPart({data: allTrapBounds, name: "TRAPBOUNDS"})
        fileData = fileData + groupPart({data: allGoalBounds, name: "STARTBOUNDS"})
        fileData = fileData + groupPart({data: allSwampBounds, name: "SWAMPBOUNDS"})
        fileData = fileData + groupPart({data: allObstacles, name: "OBSTACLES"})
        fileData = fileData + groupPart({data: allHumans, name: "HUMANGROUP"})
        fileData = fileData + groupPart({data: allHazards, name: "HAZARDGROUP"})
        fileData = fileData + supervisorPart({time: $scope.time})
        return fileData

    }

     // File APIに対応しているか確認
        if (window.File) {
            var select = document.getElementById('select');

            // ファイルが選択されたとき
            select.addEventListener('change', function (e) {
                // 選択されたファイルの情報を取得
                var fileData = e.target.files[0];

                var reader = new FileReader();
                // ファイル読み取りに失敗したとき
                reader.onerror = function () {
                    alert('ファイル読み取りに失敗しました')
                }
                // ファイル読み取りに成功したとき
                reader.onload = function () {
                    var data = JSON.parse(reader.result);
                    $scope.cells = data.cells;
                    $scope.competitionId = competitionId;

                    $scope.startTile = data.startTile;
                    $scope.numberOfDropTiles = data.numberOfDropTiles;
                    $scope.height = data.height;
                    $scope.width = data.width;
                    $scope.length = data.length;
                    $scope.name = data.name;
                    $scope.time = data.time;
                    $scope.finished = data.finished;

                    $scope.roomTiles = data.roomTiles;
                    $scope.area4Room = data.area4Room;
                    $scope.room4CanvasSave = data.room4CanvasSave;
                    $scope.room4Img.src = $scope.room4CanvasSave;
                    if (data.room4VicTypes != undefined)
                        $scope.room4VicTypes = data.room4VicTypes;

                    $scope.updateRoom4Pick();

                    if(data.startTile) $scope.cells[data.startTile.x + ',' + data.startTile.y + ',' + data.startTile.z].tile.checkpoint = false;

                    $scope.$apply();
                }

                // ファイル読み取りを実行
                reader.readAsText(fileData);
            }, false);
        }

    $scope.selectRoom2 = function() {
        if ($scope.selectRoom != 0) {
            $scope.selectRoom = 0;
        }
        else {
            $scope.selectRoom = -1;
        }
    }

    $scope.selectRoom3 = function() {
        if ($scope.selectRoom != 1) {
            $scope.selectRoom = 1;
        }
        else {
            $scope.selectRoom = -1;
        }
    }

    $scope.selectRoom4 = function() {
        if ($scope.selectRoom != 2) {
            $scope.selectRoom = 2;
        }
        else {
            $scope.selectRoom = -1;
        }
    }

    $scope.updateRoom4Pick = function() {
        if ($scope.area4Room.value == "Custom Room") {
            //inputElement.style.display = "inline";
            useCustomRoom4.style.display = "inline";
        }
        else {
            //inputElement.style.display = "none";
            useCustomRoom4.style.display = "none";
        }
    }

    function room4CorrectSize() {
        return true;
        //let img = cv.imread(imgElement);

        let context = room4CanvasSave.getContext('2d');
        let imgData = context.getImageData(0, 0, canvasWidth, canvasHeight);
        let img = cv.matFromImageData(imgData); 

        let minX = -1;
        let maxX = 0;
        let minY = -1;
        let maxY = 0;
        let width = 0;
        let height = 0;
        
        for (let i = 0; i < $scope.roomTiles[2].length; i++) {
            let tileStr = $scope.roomTiles[2][i];
            let x = tileStr.slice(0, tileStr.indexOf(","));
            let y = tileStr.slice(tileStr.indexOf(",")+1, tileStr.lastIndexOf(","));
            if (x < minX || minX == -1)
                minX = x;
            if (x > maxX)
                maxX = x;
            if (y < minY || minY == -1)
                minY = y;
            if (y > maxY)
                maxY = y;
        }

        width = (maxX - minX) / 2 + 1;
        height = (maxY - minY) / 2 + 1;
        if (width / height != img.size().width / img.size().height)
            return false;
        return true;
    }

    function has(contPoints, x, y) {
        for (let i = 0; i < contPoints.length; i++) {
        let compX = contPoints[i][0];
        let compY = contPoints[i][1];

        // Complete equality
        /* if (compX == x && compY == y)
            return true; */

        // proximity
        let dist = 0.002;
        if (Math.pow(compX - x, 2) + Math.pow(compY - y, 2) < Math.pow(dist, 2))
            return true;

        // single-axis proximity
        /* let dist = 0.0005;
        if (Math.abs(compX - x) < dist || Math.abs(compY - y) < dist)
            return true; */
        }
        return false;
    }

    let room4xOffset = 0;
    let room4zOffset = 0;
    let fullContPoints = [];
    let imgWidth = 0;
    let imgHeight = 0;
    let room4Width = 0;
    let room4Height = 0;
    let roundDigits = 5;

    function createArea4Solid() {
        let minX = -1;
        let maxX = 0;
        let minY = -1;
        let maxY = 0;
        
        for (let i = 0; i < $scope.roomTiles[2].length; i++) {
            let tileStr = $scope.roomTiles[2][i];
            let x = tileStr.slice(0, tileStr.indexOf(","));
            let y = tileStr.slice(tileStr.indexOf(",")+1, tileStr.lastIndexOf(","));
            x = parseInt(x);
            y = parseInt(y);
            if (x < minX || minX == -1)
                minX = x;
            if (x > maxX)
                maxX = x;
            if (y < minY || minY == -1)
                minY = y;
            if (y > maxY)
                maxY = y;
        }
        let x = (minX - 1) / 2;
        let y = (minY - 1) / 2;
        room4Width = (maxX - minX) / 2 + 1;
        room4Height = (maxY - minY) / 2 + 1;

        //let src = cv.imread(imgElement);
        /*let context = $scope.room4CanvasSave.getContext('2d');
        let imgData = context.getImageData(0, 0, $scope.canvasWidth, $scope.canvasHeight);
        let src = cv.matFromImageData(imgData);*/
        let src = cv.imread($scope.room4Img);

        let im = new cv.Mat();

        let blackLow = new cv.Mat(src.rows, src.cols, src.type(), [0, 0, 0, 0]);
        let blackHigh = new cv.Mat(src.rows, src.cols, src.type(), [50, 50, 50, 255]);
        cv.inRange(src, blackLow, blackHigh, im);

        let contours = new cv.MatVector();
        let hierarchy = new cv.Mat();
        cv.findContours(
            im,
            contours,
            hierarchy,
            cv.RETR_EXTERNAL,
            cv.CHAIN_APPROX_SIMPLE
        );

        let mazeWidthScale = 0.4;
        let mazeHeightScale = 0.4;
        let wallHeight = 0.06;
        let outputStr = "";
        imgWidth = src.size().width;
        imgHeight = src.size().height;
        room4Width *= 0.3 * mazeWidthScale;
        room4Height *= 0.3 * mazeHeightScale;

        let xStart = -(($scope.width / 2.0) + 0.5) * (0.3 * mazeWidthScale);
        let zStart = -(($scope.length / 2.0) + 0.5) * (0.3 * mazeHeightScale);
        let xRelPos = x * 0.3 * mazeWidthScale;
        let zRelPos = y * 0.3 * mazeHeightScale;
        let xCoord = xRelPos + xStart;
        let zCoord = zRelPos + zStart;
        zCoord -= 0.005;

        room4xOffset = xCoord;
        room4zOffset = zCoord;
        outputStr += `Solid {\n
                translation ` + xCoord.toString() + ' -0.03 ' + zCoord.toString() + `\n
                rotation 0 1 0 0\n
                name "Area4"\n
                children [\n
            `;

        fullContPoints = [];
        for (let i = 0; i < contours.size(); i++) {
            outputStr +=
                "Solid {\n children [\n DEF CURVED" + String(i) + " Shape { \nappearance Appearance { \nmaterial Material { \ndiffuseColor 0.2 0.47 0.52 \n} \n}\ngeometry IndexedFaceSet { \ncoord Coordinate { \npoint [\n";

            let contour = contours.get(i);
            let points = contour.data32S;
            let contPoints = [];
            fullContPoints.push([]);

            for (let j = 0; j < points.length; j += 2) {
                let row = points[j + 1];
                let col = points[j];
                let x = ((col / imgWidth) * room4Width).toFixed(roundDigits);
                let y = ((row / imgHeight) * room4Height).toFixed(roundDigits);

                if (!has(contPoints, x, y)) {
                    outputStr += x.toString() + " " + "0" + " " + y.toString() + ",";
                    outputStr +=
                        x.toString() + " " + wallHeight + " " + y.toString() + ",";
                    contPoints.push([x, y]);
                    fullContPoints[i].push([row, col]);
                }
            }

            outputStr += "\n]\n}\ncoordIndex [\n";
            for (let j = 0; j < contPoints.length - 1; j++) {
                outputStr +=
                (j * 2).toString() + "," +
                ((j + 1) * 2).toString() + "," +
                ((j + 1) * 2 + 1).toString() + "," +
                (j * 2 + 1).toString() + "," +
                "-1,";
            }
            let tmp = contPoints.length - 1;
            outputStr +=
                (tmp * 2).toString() + "," +
                "0" + "," +
                "1" + "," +
                (tmp * 2 + 1).toString() + "," +
                "-1,";
            for (let j = 0; j < contPoints.length; j++)
                outputStr += (j * 2 + 1).toString() + ",";
            outputStr += "-1,\n]\n}\n}\n]\n" +
                            "boundingObject USE CURVED" + String(i) + 
                            "\nname \"curved" + String(i) + "\"\n}";
        }
        outputStr += '\n]\n}\n';

        return outputStr;
    }

    function dist(point1, point2) {
        return Math.sqrt(Math.pow(point1[0] - point2[0], 2) + Math.pow(point1[1] - point2[1], 2));
    }


    function createArea4Victims(startHumanId, startHazardId) {
        let outputStrVic = "";
        let outputStrHaz = "";
        const scoringElem = ["harmed", "stable", "unharmed", "P", "O", "F", "C"];
        
        // let src = cv.imread(imgElement);
        /*let context = $scope.room4CanvasSave.getContext('2d');
        let imgData = context.getImageData(0, 0, $scope.canvasWidth, $scope.canvasHeight);
        let src = cv.matFromImageData(imgData);*/
        let src = cv.imread($scope.room4Img);

        let vicIm = new cv.Mat()
        let low = new cv.Mat(src.rows, src.cols, src.type(), [100, 0, 0, 0]);
        let high = new cv.Mat(src.rows, src.cols, src.type(), [255, 50, 50, 255]);
        cv.inRange(src, low, high, vicIm);

        let vicContours = new cv.MatVector();
        let vicHierarchy = new cv.Mat();
        cv.findContours(
            vicIm,
            vicContours,
            vicHierarchy,
            cv.RETR_EXTERNAL,
            cv.CHAIN_APPROX_SIMPLE
        );

        $scope.area4VicScore = 0;
        if ($scope.room4VicTypes.length != vicContours.size())
            $scope.room4VicTypes = []
        for (let x = 0; x < vicContours.size(); x++) {
            let M = cv.moments(vicContours.get(x), false);
            let cx = M.m10/M.m00;
            let cy = M.m01/M.m00;
            let point = [cy, cx];

            let closePoint = [0, 0];
            let closeDist = -1;
            let closeIndex = [0, 0];

            for (let i = 0; i < fullContPoints.length; i++) {
                for (let j = 0; j < fullContPoints[i].length; j++) {
                    let curDist = dist(fullContPoints[i][j], point);
                    if (curDist < closeDist || closeDist == -1) {
                        closePoint = fullContPoints[i][j];
                        closeDist = curDist;
                        closeIndex = [i, j];
                    }
                }
            }

            let vicWidth = 0.016;
            let angle = 0;
            let nextPoint = 0;
            let prevPoint = 0;

            let npInd = [closeIndex[0], closeIndex[1]];
            let ppInd = [closeIndex[0], closeIndex[1]];
            vicWidth = vicWidth * imgWidth / room4Width;
            while (dist(fullContPoints[npInd[0]][npInd[1]], fullContPoints[ppInd[0]][ppInd[1]]) < vicWidth) {
                if (ppInd[1] == 0) {
                    ppInd[1] = fullContPoints[ppInd[0]].length - 1;
                    npInd[1] += 1;
                }
                else if (npInd[1] == fullContPoints[npInd[0]].length - 1) {
                    ppInd[1] -= 1;
                    npInd[1] = 0;
                }
                else {
                    ppInd[1] -= 1;
                    npInd[1] += 1;
                }
            }
            
            let midPoint = [(fullContPoints[ppInd[0]][ppInd[1]][0] + fullContPoints[npInd[0]][npInd[1]][0]) / 2,
                            (fullContPoints[ppInd[0]][ppInd[1]][1] + fullContPoints[npInd[0]][npInd[1]][1]) / 2]
            if (dist(midPoint, point) > dist(closePoint, point)) { // convex wall
                if (closeIndex[1] == 0) {
                    nextPoint = fullContPoints[closeIndex[0]][closeIndex[1]+1];
                    prevPoint = fullContPoints[closeIndex[0]][fullContPoints[closeIndex[0]].length-1];
                }
                else if (closeIndex[1] == fullContPoints[closeIndex[0]].length-1) {
                    nextPoint = fullContPoints[closeIndex[0]][0];
                    prevPoint = fullContPoints[closeIndex[0]][closeIndex[1]-1];
                }
                else {
                    nextPoint = fullContPoints[closeIndex[0]][closeIndex[1]+1];
                    prevPoint = fullContPoints[closeIndex[0]][closeIndex[1]-1];
                }
            }
            else { // concave wall
                nextPoint = fullContPoints[npInd[0]][npInd[1]] // (y, x), i.e. (row, col)
                prevPoint = fullContPoints[ppInd[0]][ppInd[1]]
                closePoint = midPoint;
            }

            angle = Math.atan(-1*(prevPoint[0] - nextPoint[0]) / (prevPoint[1] - nextPoint[1])); // times -1 because axis different
            if (prevPoint[1] - nextPoint[1] < 0)
                angle = 3.14 + angle

            let vicX = parseFloat(((closePoint[1] / imgWidth) * room4Width).toFixed(roundDigits)) + room4xOffset;
            let vicY = parseFloat(((closePoint[0] / imgHeight) * room4Height).toFixed(roundDigits)) + room4zOffset;

            let rand = 0;
            if ($scope.room4VicTypes.length != vicContours.size()) {
                rand = parseInt(Math.random() * scoringElem.length);
                $scope.room4VicTypes.push(rand);
            }
            else
                rand = $scope.room4VicTypes[x];
            if (rand <= 2) { // victim
                outputStrVic += `
                    Victim {
                        translation `;
                    outputStrVic += vicX.toString() + ' 0 ' + vicY.toString();
                    outputStrVic += `
                        rotation 0 1 0 `;
                    outputStrVic += angle.toString() + `
                        name "Victim` + startHumanId.toString() + `"
                        type "` + scoringElem[rand] + `"
                        scoreWorth 15
                    }
                    `;
                startHumanId += 1;
            }
            else { // hazard
                outputStrHaz += `
                    HazardMap {
                        translation `;
                    outputStrHaz += vicX.toString() + ' 0 ' + vicY.toString();
                    outputStrHaz += `
                        rotation 0 1 0 `;
                    outputStrHaz += angle.toString() + `
                        name "Hazard` + startHazardId.toString() + `"
                        type "` + scoringElem[rand] + `"
                        scoreWorth 30
                    }
                    `;
                startHazardId += 1;
            }

            /*cv.circle(src, new cv.Point(cx, cy), 3, new cv.Scalar(0, 255, 0, 255), 5);
            cv.circle(src, new cv.Point(nextPoint[1], nextPoint[0]), 5, new cv.Scalar(0, 255, 255, 255), 5);
            cv.circle(src, new cv.Point(prevPoint[1], prevPoint[0]), 5, new cv.Scalar(0, 255, 255, 255), 5);
            //cv.circle(src, new cv.Point(closePoint[1], closePoint[0]), 5, new cv.Scalar(0, 0, 255, 255), 5);
            showImg(src);*/
        }
        return [outputStrVic, outputStrHaz];
    }

    $scope.cellClick = function (x, y, z, isWall, isTile) {
        var cell = $scope.cells[x + ',' + y + ',' + z];
        var halfWallTile;
        var intx = parseInt(x), inty = parseInt(y);
        console.log(cell)

        // If wall
        if (isWall) {
            if (!cell) {
                $scope.cells[x + ',' + y + ',' + z] = {
                    isWall: true,
                    halfWall: 0
                };
            } else {
                halfWallTile = false;
                if (intx % 2 == 0) {
                    if (intx != 0) {
                        halfWallTile = ($scope.roomTiles[0].indexOf(String(intx - 1) + ',' + y + ',' + z) > -1 ||
                                        $scope.roomTiles[1].indexOf(String(intx - 1) + ',' + y + ',' + z) > -1);
                    }
                    if (!halfWallTile && intx != $scope.width * 2) {
                        halfWallTile = ($scope.roomTiles[0].indexOf(String(intx + 1) + ',' + y + ',' + z) > -1 ||
                                        $scope.roomTiles[1].indexOf(String(intx + 1) + ',' + y + ',' + z) > -1);
                    }
                }
                else {
                    if (inty != 0) {
                        halfWallTile = ($scope.roomTiles[0].indexOf(x + ',' + String(inty - 1) + ',' + z) > -1 ||
                                        $scope.roomTiles[1].indexOf(x + ',' + String(inty - 1) + ',' + z) > -1);
                    }
                    if (!halfWallTile && inty != $scope.length * 2) {
                        halfWallTile = ($scope.roomTiles[0].indexOf(x + ',' + String(inty + 1) + ',' + z) > -1 ||
                                        $scope.roomTiles[1].indexOf(x + ',' + String(inty + 1) + ',' + z) > -1);
                    }
                }
                if (halfWallTile) {
                    if(cell.isWall){
                        cell.isWall = false;
                        cell.halfWall = 1;
                    }else if(cell.halfWall == 1){
                        cell.halfWall = 2;
                    }else if(cell.halfWall == 2){
                        cell.halfWall = 0;
                    }else{
                        cell.isWall = true;
                    }
                }
                else {
                    if(cell.isWall){
                        cell.isWall = false;
                    }else{
                        cell.isWall = true;
                    }
                }
            }
        } else if (isTile) {
            if (!cell) {
                cell = $scope.cells[x + ',' + y + ',' + z] = {
                    isTile: true,
                    tile: {
                        changeFloorTo: z,
                        halfTile: 0
                    }
                };
            }
            if ($scope.selectRoom != -1 && cell) {
                let undo = false
                for (a = 0; a < $scope.roomTiles.length; a++) {
                    if ($scope.roomTiles[a]) {
                        for (b = 0; b < $scope.roomTiles[a].length; b++) {
                            if ($scope.roomTiles[a][b] == x+','+y+','+z) {
                                var i = (parseInt(y - 1) / 2 * $scope.width + (parseInt(x - 1) / 2));
                                $(".tile").get(i).style.setProperty("--tileColor", "#b4ffd5");
                                $scope.roomTiles[a].splice(b, 1);
                                $scope.cells[x+','+y+','+z].tile.halfTile = 0;
                                if (a == $scope.selectRoom)
                                    undo = true;
                            }
                        }
                    }
                }
                if (!undo) {
                    $scope.roomTiles[$scope.selectRoom].push(x+','+y+','+z);
                    var i = (parseInt(y - 1) / 2 * $scope.width + (parseInt(x - 1) / 2));
                    if ($scope.selectRoom == 0) {
                        $(".tile").get(i).style.setProperty("--tileColor", "#359ef4");
                        $scope.cells[x+','+y+','+z].tile.halfTile = 1;
                        console.log('a')
                    }
                    else if ($scope.selectRoom == 1) {
                        $(".tile").get(i).style.setProperty("--tileColor", "#ed9aef");
                        $scope.cells[x+','+y+','+z].tile.halfTile = 1;
                        console.log('b')
                    }
                    else if ($scope.selectRoom == 2)
                        $(".tile").get(i).style.setProperty("--tileColor", "#7500FF");
                }
            }
            $scope.open(x, y, z);
        }
        $scope.recalculateLinear();
    }

    $scope.open = function (x, y, z) {
        if ($scope.selectRoom == -1) {
            var modalInstance = $uibModal.open({
                animation: true,
                templateUrl: '/templates/sim_editor/sim_editor_modal.2024.html',
                controller: 'ModalInstanceCtrl',
                size: 'lg',
                scope: $scope,
                resolve: {
                    x: function () {
                        return x;
                    },
                    y: function () {
                        return y;
                    },
                    z: function () {
                        return z;
                    }
                }
            });
        }
    };


    $scope.openMaxScore = function(){
        let victimScore = 0;
        let checkpointScore = 0;
        let exitBonus = 0;
        const victims = ["H", "S", "U"];
        const hazards = ["P", "O", "F", "C"];
        const areaMultiplier = [0, 1, 1.25, 1.5, 2];
        Object.keys($scope.cells).map(function(key){
            let cell = $scope.cells[key];
            if(cell.isTile){
                if(cell.tile.victims){
                    Object.keys(cell.tile.victims).map(function(dir){
                        if(victims.includes(cell.tile.victims[dir])){
                            victimScore += (cell.isLinear ? 5 : 15) * areaMultiplier[checkRoomNumberKey(key)];
                            victimScore += 10 * areaMultiplier[checkRoomNumberKey(key)];
                        }else if(hazards.includes(cell.tile.victims[dir])){
                            victimScore += (cell.isLinear ? 10 : 30) * areaMultiplier[checkRoomNumberKey(key)];
                            victimScore += 20 * areaMultiplier[checkRoomNumberKey(key)];
                        }
                    });
                }
                if(cell.tile.halfWallVic){
                    for(let i of $scope.range(16)){
                        let v = Number(cell.tile.halfWallVic[i]);
                        if(v == "") continue;
                        if(v >= 0 && v <= 3){
                            victimScore += (cell.isLinear ? 5 : 15) * areaMultiplier[checkRoomNumberKey(key)];
                            victimScore += 10 * areaMultiplier[checkRoomNumberKey(key)];
                        }else if(v >= 5 && v <= 8){
                            victimScore += (cell.isLinear ? 10 : 30) * areaMultiplier[checkRoomNumberKey(key)];
                            victimScore += 20 * areaMultiplier[checkRoomNumberKey(key)];
                        }
                    }
                }
                
                if(cell.tile.checkpoint){
                    checkpointScore += 10 * areaMultiplier[checkRoomNumberKey(key)];
                }
            }
        });
        if ($scope.area4Room.value == "Custom Room") {
            createArea4Solid();
            createArea4Victims(0, 0);
            for (let i = 0; i < $scope.room4VicTypes.length; i++) {
                if ($scope.room4VicTypes[i] <= 3)
                    victimScore += (15 + 10) * areaMultiplier[4];
                else
                    victimScore += (30 + 20) * areaMultiplier[4];
            }
        }
        else if ($scope.area4Room.value != "None") {
            for (let i = 0; i < $scope.area4Room.humans.length; i++)
                victimScore += $scope.area4Room.humans[i].score * areaMultiplier[4];
            for (let i = 0; i < $scope.area4Room.hazards.length; i++)
                victimScore += $scope.area4Room.hazards[i].score * areaMultiplier[4];
        }
        

        if(victimScore > 0) exitBonus += (victimScore + checkpointScore) * 0.1

        let html = `
            <div class='text-center'>
                <i class='fas fa-calculator fa-3x'></i>
            </div><hr>
            <table class='custom'>
                <thead>
                    <th>Victim / Hazard map score</th>
                    <th>Checkpoint score</th>
                    <th>Exit bonus</th>
                    <th>Map bonus</th>
                    <th>Total score</th>
                </thead>
                <tbody>
                    <td>${victimScore}</td>
                    <td>${checkpointScore}</td>
                    <td>${exitBonus}</td>
                    <td>${(victimScore + checkpointScore + exitBonus)}</td>
                    <td>${2*(victimScore + checkpointScore + exitBonus)}</td>
                </tbody>
            </table>
        `;
        Swal.fire({
            html: html,
            showCloseButton: true, 
        })

    }

    $scope.openCustomRoom4 = function() {
        if ($scope.roomTiles[2].length > 0) {
            let minX = -1;
            let maxX = 0;
            let minY = -1;
            let maxY = 0;
            
            for (let i = 0; i < $scope.roomTiles[2].length; i++) {
                let tileStr = $scope.roomTiles[2][i];
                let x = tileStr.slice(0, tileStr.indexOf(","));
                let y = tileStr.slice(tileStr.indexOf(",")+1, tileStr.lastIndexOf(","));
                x = parseInt(x);
                y = parseInt(y);
                if (x < minX || minX == -1)
                    minX = x;
                if (x > maxX)
                    maxX = x;
                if (y < minY || minY == -1)
                    minY = y;
                if (y > maxY)
                    maxY = y;
            }
            let x = (minX - 1) / 2;
            let y = (minY - 1) / 2;
            room4Width = (maxX - minX) / 2 + 1;
            room4Height = (maxY - minY) / 2 + 1;
            $scope.canvasWidth = 600;
            $scope.canvasHeight = $scope.canvasWidth / room4Width * room4Height;

            var modalInstance = $uibModal.open({
                animation: true,
                templateUrl: '/templates/sim_editor/custom_room_4_modal.html',
                controller: 'CustomRoom4ModalCtrl',
                size: 'lg',
                scope: $scope,
                resolve: {
                    x: function() {
                        return 3;
                    }
                }
            });
        }
    };
}]);


// Please note that $uibModalInstance represents a modal window (instance) dependency.
// It is not the same as the $uibModal service used above.

app.controller('ModalInstanceCtrl',['$scope', '$uibModalInstance', 'x', 'y', 'z', function ($scope, $uibModalInstance, x, y, z) {
    console.log($scope.cell)
    $scope.cell = $scope.$parent.cells[x + ',' + y + ',' + z];
    $scope.isStart = $scope.$parent.startTile.x == x &&
        $scope.$parent.startTile.y == y &&
        $scope.$parent.startTile.z == z;
    $scope.height = $scope.$parent.height;
    $scope.z = z;
    $scope.oldFloorDestination = $scope.cell.tile.changeFloorTo;

    $scope.startChanged = function () {
        if ($scope.isStart) {
            $scope.$parent.startTile.x = x;
            $scope.$parent.startTile.y = y;
            $scope.$parent.startTile.z = z;
        }
    }

    $scope.blackChanged = function () {
       $scope.$parent.recalculateLinear();
    }

     $scope.isHalfWall = function(r, c) {
        var ind = -1, tmp = r * 10 + c;
        if (tmp == 12) ind = 0;
        else if (tmp == 23) ind = 1;
        else if (tmp == 32) ind = 2;
        else if (tmp == 21) ind = 3;
        if (((r % 2 == 1) ^ (c % 2 == 1)) && (r != 0 && c != 0 && r != 4 && c != 4) && 
            $scope.cell && $scope.cell.tile && $scope.cell.tile.curve != undefined && $scope.cell.tile.halfWallIn[ind])
            return 1;
        return 0;
     }
     
     $scope.innerTileClick = function(r, c) {
         console.log(r)
         console.log(c)
        var ind = -1, tmp = r * 10 + c;
        if (tmp == 12) ind = 0;
        else if (tmp == 23) ind = 1;
        else if (tmp == 32) ind = 2;
        else if (tmp == 21) ind = 3;
        if ($scope.cell && $scope.cell.tile) {
            if (r % 2 == 1 && c % 2 == 1) { //curved
                quad = parseInt(r / 2) * 2 + parseInt(c / 2);
                $scope.cell.tile.curve[quad] = ($scope.cell.tile.curve[quad] + 1) % 5;
            }
            else if (((r % 2 == 1) ^ (c % 2 == 1)) && (r != 0 && c != 0 && r != 4 && c != 4)){//half wall
                $scope.cell.tile.halfWallIn[ind] = !$scope.cell.tile.halfWallIn[ind];
            } 
                
        }
     }

    $scope.range = function (n) {
        arr = [];
        for (var i = 0; i < n; i++) {
            arr.push(i);
        }
        return arr;
    }
    $scope.ok = function () {
        $scope.$parent.recalculateLinear();
        $uibModalInstance.close();
    };

}]);

app.controller('CustomRoom4ModalCtrl',['$scope', '$uibModalInstance', function ($scope, $uibModalInstance){

    let canvas;
    $scope.importImg = null;

    $scope.downloadCanvas = function downloadCanvas() {
        if (!canvas)
            canvas = document.getElementById('room4Canvas');

        let imgData = canvas.toDataURL();
        var link = document.createElement("a");
        link.download = 'custom_room_4_pic.png';
        link.href = imgData;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        delete link;
    }

    $scope.clearCanvas = function() {
        if (!canvas)
            canvas = document.getElementById('room4Canvas');
        let context = canvas.getContext('2d');
        
        context.fillStyle = "white";
        context.fillRect(0, 0, canvas.width, canvas.height);
        //$scope.$parent.room4CanvasSave = canvas.toDataURL("image/png");
        $scope.$parent.room4CanvasSave = null;
        $scope.$parent.room4Img.src = $scope.$parent.room4CanvasSave;
        $scope.$parent.drawBlueBox();
    }

    $scope.click = function() {
        let canvas = document.getElementById('room4Canvas');
        let imgElem = document.getElementById('img');
        let context = canvas.getContext('2d');
        context.drawImage(imgElem, 0, 0);

        var select = document.getElementById('select');

        select.addEventListener('change', function (e) {
            var fileData = e.target.files[0];
            imgElem.src = URL.createObjectURL(fileData);
            $scope.click();
        });
    }

    $scope.closeRoom4 = function() {
        $uibModalInstance.close();
    }
}]);

app.directive("drawing", function(){
    return {
        restrict: "A",
        link: function($scope, element){
        var ctx = element[0].getContext('2d');
        
        // variable that decides if something should be drawn on mousemove
        var drawing = false;
        
        // the last coordinates before the current move
        var lastX;
        var lastY;
        
        // modal initialization
        let room4Canvas = element[0];
        let context = ctx;
        if ($scope.$parent.room4CanvasSave != null) {
            canvasImg = new Image;
            canvasImg.onload = function() {
                context.drawImage(canvasImg, 0, 0);
            };
            canvasImg.src = $scope.$parent.room4CanvasSave;
        }
        room4Canvas.width = $scope.$parent.canvasWidth;
        room4Canvas.height = $scope.$parent.canvasHeight;
        context.fillStyle = "white";
        context.fillRect(0, 0, room4Canvas.width, room4Canvas.height);

        let black = '#000000';
        let red = '#FF0000';
        let white = '#FFFFFF';
        let blue = '#0000FF';
        let canvasColor = black;
        let wallCheckbox = document.getElementById("drawWall");
        let vicCheckbox = document.getElementById("drawVic");
        let eraseCheckbox = document.getElementById("erase");
        wallCheckbox.checked = 1;
        vicCheckbox.checked = 0;
        eraseCheckbox.checked = 0;
        wallCheckbox.addEventListener('change', function (e) {
            let checked = !e.target.checked;
            if (!checked) {
                vicCheckbox.checked = false;
                eraseCheckbox.checked = false;
                canvasColor = black;
            }
            else
                e.target.checked = true;
        });
        vicCheckbox.addEventListener('change', function (e) {
            let checked = !e.target.checked;
            if (!checked) {
                wallCheckbox.checked = false;
                eraseCheckbox.checked = false;
                canvasColor = red;
            }
            else
                e.target.checked = true;
        });
        eraseCheckbox.addEventListener('change', function (e) {
            let checked = !e.target.checked;
            if (!checked) {
                wallCheckbox.checked = false;
                vicCheckbox.checked = false;
                canvasColor = white;
            }
            else
                e.target.checked = true;
        });

        let inputFile = document.getElementById("importCanvas");
        let img = new Image;
        img.onload = function() {
            context.drawImage(img, 0, 0, room4Canvas.width, room4Canvas.height);
            $scope.$parent.drawBlueBox();
            $scope.$parent.room4CanvasSave = room4Canvas.toDataURL("image/png");
            $scope.$parent.room4Img.src = $scope.$parent.room4CanvasSave;
        }
        inputFile.addEventListener('change', function (e) {
            img.src = URL.createObjectURL(e.target.files[0]);
        });

        // cover tiles in canvas that are not actually room 4
        let minX = -1;
        let maxX = 0;
        let minY = -1;
        let maxY = 0;
        for (let i = 0; i < $scope.$parent.roomTiles[2].length; i++) {
            let tileStr = $scope.$parent.roomTiles[2][i];
            let x = tileStr.slice(0, tileStr.indexOf(","));
            let y = tileStr.slice(tileStr.indexOf(",")+1, tileStr.lastIndexOf(","));
            x = parseInt(x);
            y = parseInt(y);
            if (x < minX || minX == -1)
                minX = x;
            if (x > maxX)
                maxX = x;
            if (y < minY || minY == -1)
                minY = y;
            if (y > maxY)
                maxY = y;
        }
        room4Width = (maxX - minX) / 2 + 1;
        room4Height = (maxY - minY) / 2 + 1;

        let blockWidth = room4Canvas.width / room4Width;
        
        $scope.$parent.drawBlueBox = function () {
            for (let x = minX; x <= maxX; x = parseInt(x) + 2) {
                for (let y = minY; y <= maxY; y = parseInt(y) + 2) {
                    let found = false;
                    for (let i = 0; i < $scope.$parent.roomTiles[2].length; i++) {
                        if ($scope.$parent.roomTiles[2][i] == x+','+y+',0') {
                            found = true;
                            break;
                        }
                    }
                    if (!found) {
                        let startX = (x - minX) / 2 * blockWidth;
                        let startY = (y - minY) / 2 * blockWidth;
                        context.fillStyle = blue;
                        context.fillRect(startX, startY, blockWidth, blockWidth);
                        context.fillStyle = white;
                    }
                }
            }
        }

        $scope.$parent.drawBlueBox();

        element.bind('mousedown', function(event){
            if(event.offsetX!==undefined){
            lastX = event.offsetX;
            lastY = event.offsetY;
            } else {
            /*lastX = event.layerX - event.currentTarget.offsetLeft;
            lastY = event.layerY - event.currentTarget.offsetTop;*/
            }
            
            // begins new line
            ctx.beginPath();
            
            drawing = true;
        });
        element.bind('mousemove', function(event){
            if(drawing){
            // get current mouse position
            if(event.offsetX!==undefined){
                currentX = event.offsetX;
                currentY = event.offsetY;
            } else {
                /*currentX = event.layerX - event.currentTarget.offsetLeft;
                currentY = event.layerY - event.currentTarget.offsetTop;*/
            }
            
            draw(lastX, lastY, currentX, currentY);
            
            // set current coordinates to last one
            lastX = currentX;
            lastY = currentY;
            }
            
        });
        element.bind('mouseup', function(event){
            // stop drawing
            drawing = false;
            $scope.$parent.room4CanvasSave = room4Canvas.toDataURL("image/png");
            $scope.$parent.room4Img.src = $scope.$parent.room4CanvasSave;
        });
            
        // canvas reset
        function reset(){
        element[0].width = element[0].width; 
        }
        
        function draw(lX, lY, cX, cY){
            // make sure drawing in a room4 tile
            let gridX1 = (parseInt(cX / blockWidth) * 2) + parseInt(minX);
            let gridY1 = (parseInt(cY / blockWidth) * 2) + parseInt(minY);
            let gridX2 = (parseInt(lX / blockWidth) * 2) + parseInt(minX);
            let gridY2 = (parseInt(lY / blockWidth) * 2) + parseInt(minY);
            let found = false;
            for (let i = 0; i < $scope.$parent.roomTiles[2].length; i++) {
                if ($scope.$parent.roomTiles[2][i] == gridX1+','+gridY1+',0' ||
                    $scope.$parent.roomTiles[2][i] == gridX2+','+gridY2+',0') {
                    found = true;
                    break;
                }
            }
            if (found) {
                // line from
                ctx.moveTo(lX,lY);
                // to
                ctx.lineTo(cX,cY);
                // color
                ctx.strokeStyle = canvasColor;
                // width
                if (canvasColor == white)
                    ctx.lineWidth = 20;
                else
                    ctx.lineWidth = 2;
                // draw it
                ctx.stroke();

                $scope.$parent.drawBlueBox();
            }
        }
        }
    };
});

