// -*- tab-width: 2 -*-
const express = require('express');

const publicRouter = express.Router();
const privateRouter = express.Router();
const adminRouter = express.Router();
const logger = require('../config/logger').mainLogger;
const { ObjectId } = require('mongoose').Types;
const auth = require('../helper/authLevels');
const competitiondb = require('../models/competition');
const { ACCESSLEVELS } = require('../models/user');
const ruleDetector = require('../helper/ruleDetector');


/* GET home page. */

adminRouter.get('/setting', function (req, res) {
  res.render('signage/setting', { user: req.user });
});

adminRouter.get('/setting/files', function (req, res) {
  res.render('signage/files', { user: req.user });
});

adminRouter.get('/setting/editor', function (req, res) {
  res.render('signage/editor', { user: req.user });
});

adminRouter.get('/setting/editor/:id', function (req, res) {
  const { id } = req.params;
  res.render('signage/editor', { user: req.user, id });
});

privateRouter.get('/games/:competitionid/', function (req, res, next) {
  const id = req.params.competitionid;

  if (!ObjectId.isValid(id)) {
    return next();
  }

  if (auth.authCompetition(req.user, id, ACCESSLEVELS.VIEW))
    res.render('signage/game_monitor', { id, user: req.user });
  else res.render('access_denied', { user: req.user });
});

privateRouter.get('/display/:sigId/:group', function (req, res, next) {
  const { sigId } = req.params;
  const { group } = req.params;
  if (!ObjectId.isValid(sigId)) {
    return next();
  }

  res.render('main_signage', {
    user: req.user,
    sigId,
    group,
    competition: null,
  });
});

privateRouter.get(
  '/display/:sigId/:group/:competitionId',
  function (req, res, next) {
    const { sigId } = req.params;
    const { group } = req.params;
    const { competitionId } = req.params;

    if (!ObjectId.isValid(sigId)) {
      return next();
    }
    if (!ObjectId.isValid(competitionId)) {
      return next();
    }

    if (auth.authCompetition(req.user, competitionId, ACCESSLEVELS.VIEW))
      res.render('main_signage', {
        user: req.user,
        sigId,
        group,
        competition: competitionId,
      });
    else res.render('access_denied', { user: req.user });
  }
);

privateRouter.get(
  '/games/:competitionid/:sigId/:grpId',
  function (req, res, next) {
    const id = req.params.competitionid;
    const { sigId, grpId } = req.params;

    if (!ObjectId.isValid(id)) {
      return next();
    }

    if (auth.authCompetition(req.user, id, ACCESSLEVELS.VIEW))
      res.render('signage/game_monitor', { id, user: req.user, sigId, grpId });
    else res.render('access_denied', { user: req.user });
  }
);

privateRouter.get(
  '/display/:competitionid/score/:leagueId',
  function (req, res, next) {
    const id = req.params.competitionid;
    const { leagueId } = req.params;
    if (!ObjectId.isValid(id)) {
      return next();
    }

    competitiondb.competition
      .findOne({
        _id: id,
      })
      .lean()
      .exec(async function (err, data) {
        if (err) {
          logger.error(err);
          res.status(400).send({
            msg: 'Could not get competition',
            err: err.message,
          });
        } else {
          const ruleInfo = await ruleDetector.getLeagueTypeAndRule(id, leagueId);
          res.render(`signage/ranking/${ruleInfo.type}_${ruleInfo.rule}`, {
            id,
            user: req.user,
            leagueId
          });
        }
      });
  }
);

privateRouter.get('/clock/:competitionid', function (req, res, next) {
  const id = req.params.competitionid;
  res.render('signage/clock', { id, user: req.user });
});

privateRouter.get('/field/:competitionid/:fieldid', function (req, res) {
  const id = req.params.fieldid;
  const cid = req.params.competitionid;

  if (!ObjectId.isValid(id)) {
    return next();
  }
  res.render('signage/field_view', {
    id,
    cid,
  });
});

module.exports.public = publicRouter;
module.exports.private = privateRouter;
module.exports.admin = adminRouter;
