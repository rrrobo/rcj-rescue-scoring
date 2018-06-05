const cv = require('opencv4nodejs');
const jsQR = require('jsqr');
const defs = require('./scoreSheetUtil');

module.exports.drawPosdataToSheet = function (sheetMat, posData, maxLevel) {
  if (maxLevel <= 0) {
    return;
  }

  sheetMat.drawRectangle(new cv.Rect(posData.x, posData.y, posData.w, posData.h), new cv.Vec3(0, 255, 0), 1, 8, 0);

  for (let i = 0; i < posData.children.length; i++) {
    this.drawPosdataToSheet(sheetMat, posData.children[i], maxLevel - 1)
  }
};


/**
 * processes a posdata checkbox element on the normalized mat
 * @param mat normalized mat
 * @param posdata posdata for the element to process
 * @returns number that is proportional to the amount of grey in the checkbox area if element
 * is a checkbox, otherwise null
 */
module.exports.processPosdataCheckbox = function (mat, posdata) {
  if (posdata.type !== defs.InputTypeEnum.CHECKBOX) {
    return null;
  }

  let matPosdata = mat.getRegion(new cv.Rect(posdata.x, posdata.y, posdata.w, posdata.h));

  let cumulative = 0;
  for (let y = 0; y < posdata.h; y++) {
    for (let x = 0; x < posdata.w; x++) {
      cumulative += (255 - matPosdata.at(y, x));
    }
  }
  return cumulative;
};


/**
 * processes a posdata matrixrow element on the normalized mat
 * @param mat normalized mat
 * @param posdata posdata for the element to process
 * @returns index of the column with the highest value of grey if element
 * is a matrixrow, otherwise null
 */
module.exports.processPosdataMatrixrow = function (mat, posdata) {
  if (posdata.type !== defs.InputTypeEnum.MATRIXROW) {
    return null;
  }

  let valMax = 0, iMax = 0;
  for (let i = 0; i < posdata.children.length; i++) {
    let val = this.processPosdataCheckbox(mat, posdata.children[i]);
    if (val > valMax) {
      valMax = val;
      iMax = i;
    }
  }
  return iMax;
};


/**
 * processes a posdata matrix element on the normalized mat
 * @param mat normalized mat
 * @param posdata posdata for the element to process
 * @returns array of indexes of MATRIXROW if element is a matrix, otherwise null
 */
module.exports.processPosdataMatrix = function (mat, posdata) {
  if (posdata.type !== defs.InputTypeEnum.MATRIX) {
    return null;
  }

  let rowCrossedIndexes = [];
  for (let i = 0; i < posdata.children.length; i++) {
    rowCrossedIndexes.push(this.processPosdataMatrixrow(mat, posdata.children[i]))
  }
  return rowCrossedIndexes;
};

/**
 * processes a posdata text element on the normalized mat
 * @param mat normalized mat
 * @param posdata posdata for the element to process
 * @returns extracted mat region of the text field if element is a matrix, otherwise null
 */
module.exports.processPosdataText = function (mat, posdata) {
  if (posdata.type !== defs.InputTypeEnum.TEXT) {
    return null;
  }

  return {
    data: cv.imencode(
      ".jpg",
      mat.getRegion(new cv.Rect(posdata.x, posdata.y, posdata.w, posdata.h))
    ),
    contentType: "image/jpg"
  };
};

/**
 * processes a posdata matrixtext element on the normalized mat
 * @param mat normalized mat
 * @param posdata posdata for the element to process
 * @returns object of the shape {img, indexes} where img is the mat of the whole matrix and text
 * indexes is the return value of MATRIX if element is a matrixtext, otherwise null
 */
module.exports.processPosdataMatrixText = function (mat, posdata) {
  if (posdata.type !== defs.InputTypeEnum.MATRIXTEXT) {
    return null;
  }

  return {
    img: {
      data: cv.imencode(
        ".jpg",
        mat.getRegion(new cv.Rect(posdata.x, posdata.y, posdata.w, posdata.h))
      ),
      contentType: "image/jpg"
    },
    indexes: this.processPosdataMatrix(mat, posdata.children[1].posData)
  };
};

/**
 * processes a posdata qr element on the normalized mat
 * @param mat normalized mat
 * @param posdata posdata for the element to process
 * @returns data of the qr code as string if element is a qr and a qr could be
 * detected, otherwise null
 */
module.exports.processPosdataQR = function (mat, posdata) {
  if (posdata.type !== defs.InputTypeEnum.QR) {
    return null;
  }

  let code = jsQR(
    new Uint8ClampedArray(
      mat.getRegion(
        new cv.Rect(posdata.x, posdata.y, posdata.w, posdata.h)
      ).cvtColor(cv.COLOR_GRAY2BGRA).getData()
    ),
    posdata.w,
    posdata.h
  );
  if (code) {
    code = code.data
  }
  return code;
};

module.exports.processPosdataQRFull = function (filename) {
  let mat = cv.imread(filename).bgrToGray().resizeToMax(1000);
  let code = jsQR(
    new Uint8ClampedArray(mat.cvtColor(cv.COLOR_GRAY2BGRA).getData()),
    mat.cols,
    mat.rows
  );
  if (code) {
    code = code.data
  }
  return code;
};

/**
 * Extracts position markers from the raw input image and scales the image in a way that
 * the posData pixel value from the sheet generation match the image
 * @param sheetMat raw sheet image
 * @param posMarkersPosData posData
 * @returns {Mat} normalized sheet
 */
module.exports.processPosMarkers = function (sheetMat, posMarkersPosData) {
  const params = new cv.SimpleBlobDetectorParams();
  params.filterByArea = false;
  params.filterByCircularity = true;
  params.minCircularity = 0.7; // Find Squares
  params.minCircularity = 0.8;
  params.filterByColor = false;
  params.filterByConvexity = false;
  params.filterByInertia = false;
  params.minThreshold = 10;
  params.thresholdStep = 4;
  params.maxThreshold = 200;

  const detector = new cv.SimpleBlobDetector(params);
  const allKeypoints = detector.detect(sheetMat.gaussianBlur(new cv.Size(5, 5), 0, 0, cv.BORDER_CONSTANT));
  const largestKeypoints = allKeypoints.sort((k1, k2) => k2.size - k1.size).slice(0, 3);

  const keyPointsSortX = largestKeypoints.slice(0).sort((k1, k2) => k2.point.x - k1.point.x);
  const keyPointsSortY = largestKeypoints.slice(0).sort((k1, k2) => k2.point.y - k1.point.y);

  return sheetMat.getRegion(
    new cv.Rect(
      keyPointsSortX[2].point.x,
      keyPointsSortY[2].point.y,
      keyPointsSortX[0].point.x - keyPointsSortX[2].point.x,
      keyPointsSortY[0].point.y - keyPointsSortY[2].point.y
    )
  ).resizeToMax(posMarkersPosData.h)
    .warpAffine(
      new cv.Mat([
          [1, 0, posMarkersPosData.children[0].x + posMarkersPosData.children[0].w / 2],
          [0, 1, posMarkersPosData.children[0].y + posMarkersPosData.children[0].h / 2]
        ], cv.CV_32FC1
      ), new cv.Size(posMarkersPosData.w + posMarkersPosData.children[0].x, posMarkersPosData.h + posMarkersPosData.children[0].y)
    );
};