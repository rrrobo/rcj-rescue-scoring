//= =======================================================================
//                          Libraries
//= =======================================================================

const express = require('express');

const publicRouter = express.Router();
const privateRouter = express.Router();
const adminRouter = express.Router();
const validator = require('validator');
const { ObjectId } = require('mongoose').Types;
const pathL = require('path');
const fs = require('fs');
const mime = require('mime');
const nodemailer = require('nodemailer');
const { htmlToText } = require('html-to-text');
const crypto = require('crypto');
const { ACCESSLEVELS } = require('../../models/user');
const auth = require('../../helper/authLevels');
const logger = require('../../config/logger').mainLogger;
const query = require('../../helper/query-helper');
const mailDb = require('../../models/mail');
const competitiondb = require('../../models/competition');
const sanitizeFilename = require('sanitize-filename');
const {escapeRegExp, toLength} = require('lodash');
const mkdirp = require('mkdirp');


const S = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const N = 32;

const TRANSPARENT_GIF_BUFFER = Buffer.from(
  'R0lGODlhAQABAIAAAP///wAAACwAAAAAAQABAAACAkQBADs=',
  'base64'
);

function getIP(req) {
  if (req.headers['x-forwarded-for']) {
    return req.headers['x-forwarded-for'];
  }
  if (req.connection && req.connection.remoteAddress) {
    return req.connection.remoteAddress;
  }
  if (req.connection.socket && req.connection.socket.remoteAddress) {
    return req.connection.socket.remoteAddress;
  }
  if (req.socket && req.socket.remoteAddress) {
    return req.socket.remoteAddress;
  }
  return '0.0.0.0';
}

function template(string, values){
  return string.replace(/\$\{(.*?)\}/g, function(all, key){
      return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : "";
  });
}

let smtp;
if (process.env.MAIL_SMTP &&process.env.MAIL_PORT &&process.env.MAIL_FROM) {
  let smtp_conf;
  if(process.env.MAIL_USER && process.env.MAIL_PASS){
    smtp_conf = {
      host: process.env.MAIL_SMTP,
      port: process.env.MAIL_PORT,
      secure: process.env.MAIL_PORT == 465,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    };
  }else{
    //No auth
    smtp_conf = {
      host: process.env.MAIL_SMTP,
      port: process.env.MAIL_PORT,
      use_authentication: false,
      tls: {
          rejectUnauthorized: false
      }
    };
  }
  smtp = nodemailer.createTransport(smtp_conf);
} else {
  smtp = null;
}

publicRouter.post('/auth/:competitionId/:leagueId/:lang', function (req, res, next) {
  const { competitionId } = req.params;
  const { leagueId } = req.params;
  const { lang } = req.params;
  const {passCode} = req.body;
  const {mail} = req.body;

  competitiondb.competition
    .findById(competitionId)
    .select("name registration")
    .exec(function (err, dbCompetition) {
      if (err || dbCompetition == null) {
        if (!err) err = { message: 'No competition found' };
          res.status(400).send({
            msg: 'Could not get competition',
            err: err.message,
          });
        } else if (dbCompetition) {
          const now = new Date();
          const timestamp = Math.floor(now.getTime() / 1000);
          let l = dbCompetition.registration.filter(r => r.league == leagueId && r.enable &&  r.deadline >= timestamp && r.passCode == passCode);
          if(l.length == 1){
            if(smtp == null){
              res.status(500).send({
                msg: 'Please check smtp parameters',
              });
              return;
            }
            
            const token = Array.from(crypto.randomFillSync(new Uint8Array(N))).map((n) => S[n % S.length]).join('');
            const newMailAuth = new mailDb.mailAuth({
              competition: dbCompetition._id,
              league: leagueId,
              token: token,
              mail: mail
            });
  
            newMailAuth.save(function (err, authData) {
              if (err) {
                logger.error(err);
              } else {
                let fileName = "Email Verification.html";
                if(lang == 'ja') fileName = "メール認証.html";
                const path = `${__dirname}/../../templates/mail/${fileName}`;
                fs.stat(path, (err, stat) => {
                  // Handle file not found
                  if (err !== null && err.code === 'ENOENT') {
                    res.status(404).send({
                      msg: 'Template file not found',
                    });
                    return;
                  }
                  fs.readFile(path, function (err, data) {
                    let html = data.toString()
                      .replace(/\r?\n/g, '')
                      .replace(/<p><br><\/p>/g, '<br>')
                      .replace(/<\/p><p>/g, '<br>')
                      .replace(/<span class="ql-cursor">﻿<\/span>/, '');
                    let variable ={
                      "competitionName": dbCompetition.name,
                      "registrationURL": `${process.env.PROTOCOL}://${process.env.HOSTNAME}/registration/${authData._id}/${token}`
                    }
                    html = template(html, variable);

                    const text = htmlToText(html, {
                      tags: { a: { options: { hideLinkHrefIfSameAsText: true } } },
                    });
                
                    const message = {
                      from: {
                        name: process.env.MAIL_SENDER || 'RoboCupJunior CMS',
                        address: process.env.MAIL_FROM,
                      },
                      to: mail,
                      subject: `${fileName.slice( 0, -5 )} [${dbCompetition.name}]`,
                      html,
                      text,
                    };

                    try {
                      smtp.sendMail(message, function (error, info) {
                        if (error) {
                          logger.error(error.message);
                        } else {            
                          return res.status(200).send({
                            msg: 'Emails sent',
                          });
                        }
                      });
                    } catch (e) {
                      logger.error(e);
                      return res.status(500).send({
                        msg: e,
                      });
                    } 
                  });
                }); 
              }
            });

            
          }else{
            return res.status(403).send({
              msg: 'Auth Error'
            });
          }
          
      }
    });
  
});



publicRouter.post('/reg/:authId/:token/:lang', function (req, res, next) {
  const { authId } = req.params;
  const { token } = req.params;
  const { lang } = req.params;
  const {teamName} = req.body;
  const {region} = req.body;

  mailDb.mailAuth
    .findOne({
      _id: authId,
      token: token
    })
    .populate("competition")
    .exec(function (err, authInfo) {
      if (err || authInfo == null) {
        if (!err) err = { message: 'No Auth info found' };
        return res.status(403).send({
          msg: 'Auth Error'
        });
      } else {
        authInfo.remove(function (err, authData) {
          if (err) {
            logger.error(err);
          } else {
            const team_token = Array.from(crypto.randomFillSync(new Uint8Array(N))).map((n) => S[n % S.length]).join('');
            const newTeam = new competitiondb.team({
              name: teamName,
              league: authInfo.league,
              competition: authInfo.competition._id,
              teamCode: "",
              country: region,
              document: {
                token: team_token,
                answers: [],
              },
              email: [authInfo.mail],
            });
    
            newTeam.save(function (err, teamData) {
              if (err) {
                logger.error(err);
                res.status(400).send({
                  msg: 'Error creating team',
                  err: err.message,
                });
              } else {
                let path = `${__dirname}/../../documents/${authInfo.competition._id}/${teamData._id}`;
                mkdirp(path, function (err) {
                  if (err) logger.error(err);
                });

                //Send mail
                if(smtp == null){
                  res.status(500).send({
                    msg: 'Please check smtp parameters',
                  });
                  return;
                }
                let fileName = "Team registration completed.html";
                if(lang == 'ja') fileName = "チーム登録完了.html";
                path = `${__dirname}/../../templates/mail/${fileName}`;
                fs.stat(path, (err, stat) => {
                  // Handle file not found
                  if (err !== null && err.code === 'ENOENT') {
                    res.status(404).send({
                      msg: 'Template file not found',
                    });
                    return;
                  }
                  fs.readFile(path, function (err, data) {
                    let html = data.toString()
                      .replace(/\r?\n/g, '')
                      .replace(/<p><br><\/p>/g, '<br>')
                      .replace(/<\/p><p>/g, '<br>')
                      .replace(/<span class="ql-cursor">﻿<\/span>/, '');
                    let variable ={
                      "teamName": teamName,
                      "competitionName": authInfo.competition.name,
                      "mypageURL": `${process.env.PROTOCOL}://${process.env.HOSTNAME}/mypage/${teamData._id}/${team_token}`,
                      "documentURL": `${process.env.PROTOCOL}://${process.env.HOSTNAME}/document/${teamData._id}/${team_token}`
                    }
                    html = template(html, variable);

                    let html4text = html;
                    const regexpHref = /(href=)["|'](.*?)["|']+/g;

                    const mailId = Array.from(crypto.randomFillSync(new Uint8Array(N)))
                      .map((n) => S[n % S.length])
                      .join('');

                    let match;
                    let replacedURL = [];
                    while ((match = regexpHref.exec(html)) !== null) {
                      if (match[2].indexOf('/api/mail/click/') == -1) {
                        let Mtoken = Array.from(crypto.randomFillSync(new Uint8Array(N / 4))).map((n) => S[n % S.length]).join('');
                
                        html = html.replace(
                          new RegExp(escapeRegExp(match[0]), 'g'),
                          `href="${process.env.PROTOCOL}://${process.env.HOSTNAME}/api/mail/click/${mailId}/${Mtoken}"`
                        );
                        html4text = html4text.replace(
                          new RegExp(escapeRegExp(match[2]), 'g'),
                          `${process.env.PROTOCOL}://${process.env.HOSTNAME}/api/mail/click/${mailId}/${Mtoken}`
                        );
                
                        const tmp = {
                          token: Mtoken,
                          url: match[2],
                        };
                        replacedURL.push(tmp);
                      }
                    }
                
                    const text = htmlToText(html4text, {
                      tags: { a: { options: { hideLinkHrefIfSameAsText: true } } },
                    });

                    html = `<img src="${process.env.PROTOCOL}://${process.env.HOSTNAME}/api/mail/open/${mailId}">${html}`;
                
                    const message = {
                      from: {
                        name: process.env.MAIL_SENDER || 'RoboCupJunior CMS',
                        address: process.env.MAIL_FROM,
                      },
                      to: authInfo.mail,
                      subject: `${fileName.slice( 0, -5 )} [${authInfo.competition.name}]`,
                      html,
                      text,
                    };

                    try {
                      smtp.sendMail(message, function (error, info) {
                        if (error) {
                          logger.error(error.message);
                        } else {
                          const now = Math.floor(new Date().getTime() / 1000);     
                          const newMail = new mailDb.mail({
                            competition: teamData.competition,
                            team: teamData._id,
                            mailId,
                            messageId: info.messageId,
                            time: now,
                            to: authInfo.mail,
                            subject: `${fileName.slice( 0, -5 )} [${authInfo.competition.name}]`,
                            html,
                            plain: text,
                            status: 0,
                            events: [
                              {
                                time: now,
                                event: '== Emails have been sent out. ==',
                                user: '[System] Self registration',
                              },
                            ],
                            replacedURL,
                          });
                          newMail.save(function (err, data) {
                            if (err) {
                              logger.error(err);
                              return res.status(500).send({
                                msg: err.message,
                              });
                            } else {
                              return res.status(200).send({
                                msg: 'Emails sent',
                              });
                            }
                          });
                        }
                      });
                    } catch (e) {
                      logger.error(e);
                      return res.status(500).send({
                        msg: e,
                      });
                    } 
                  });
                });
              }
            });
          }
        });
      }
    });
  
});

publicRouter.all('*', function (req, res, next) {
  next();
});
privateRouter.all('*', function (req, res, next) {
  next();
});

module.exports.public = publicRouter;
module.exports.private = privateRouter;
module.exports.admin = adminRouter;