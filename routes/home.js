// -*- tab-width: 2 -*-
const express = require('express');

const publicRouter = express.Router();
const privateRouter = express.Router();
const adminRouter = express.Router();
const { ObjectId } = require('mongoose').Types;
const auth = require('../helper/authLevels');
const { ACCESSLEVELS } = require('../models/user');

/* GET home page. */
publicRouter.get('/', function (req, res) {
  res.render('home', { user: req.user });
});

publicRouter.get('/scanner/:mode', function (req, res, next) {
  const { mode } = req.params;

  res.render('scanner', { mode, user: req.user });
});

publicRouter.get('/:competitionid', async function (req, res, next) {
  const id = req.params.competitionid;

  if (!ObjectId.isValid(id)) {
    return next();
  }

  res.render('competition_home', {
    id,
    user: req.user,
    judge: auth.authCompetition(req.user, id, ACCESSLEVELS.JUDGE),
    interview: await auth.authCompetitionRole(req.user, id, "INTERVIEW")
  });
});

privateRouter.get('/:competitionid/teams', function (req, res, next) {
  const id = req.params.competitionid;

  if (!ObjectId.isValid(id)) {
    return next();
  }

  res.render('team_home', {
    id,
    user: req.user,
    judge: auth.authCompetition(req.user, id, ACCESSLEVELS.JUDGE),
    view: auth.authCompetition(req.user, id, ACCESSLEVELS.VIEW),
  });
});

publicRouter.get('/access_denied', function (req, res) {
  const iframe = req.query.iframe;
  res.render('access_denied', { user: req.user, iframe});
});

module.exports.public = publicRouter;
module.exports.private = privateRouter;
module.exports.admin = adminRouter;
