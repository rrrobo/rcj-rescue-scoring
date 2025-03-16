const Queue = require('bull');
const fs = require('fs-extra');
const onezip = require('onezip');
const archiver = require('archiver');
const rimraf = require('rimraf');
const chmodr = require('chmodr');
const competitiondb = require('../models/competition');
const lineMapDb = require('../models/lineMap');
const lineRunDb = require('../models/lineRun');
const mazeMapDb = require('../models/mazeMap');
const mazeRunDb = require('../models/mazeRun');
const simRunDb = require('../models/simRun');
const documentDb = require('../models/document');
const mailDb = require('../models/mail');
const reservationDb = require('../models/reservation');
const surveyDb = require('../models/survey');
const userdb = require('../models/user');
const base_tmp_path = `${__dirname}/../tmp/`;
const { ACCESSLEVELS } = require('../models/user');
const logger = require('../config/logger').mainLogger;
const glob = require('glob');
const path = require('path')

const Bversion = "24.0";

const b_interval = process.env.BACKUP_INTERVAL_HOUR;
const b_keep = process.env.BACKUP_KEEP_VERSION;

const backupQueue = new Queue('backup', {
  redis: {port: process.env.REDIS_PORT, host: process.env.REDIS_HOST},
  limiter: {
    max: 1,
    duration: 10000
  }
});

backupQueue.obliterate({ force: true });

backupQueue.process('backup', function(job, done){
  const {competitionId, mode} = job.data;
  const folderName = Math.floor( new Date().getTime() / 1000 );
  let prefix = "";
  if (mode == 'auto') prefix = "_";
  const folderPathTmp = `./backupTmp/${prefix}${folderName}`;
  const dstPath = `./backup/${competitionId}/${prefix}${folderName}.cms`;
  fs.mkdirsSync(folderPathTmp);
  fs.mkdirsSync(path.dirname(dstPath));

  jobProgress = 0;
  const maxCount = 21;
  let outputCount = 0;
  job.progress(0);
  job.update({
    competitionId,
    folderName
  });

  fs.writeFile(`${folderPathTmp}/version.json`,JSON.stringify({ version: Bversion }), (err) => {
    if(err){
      done(new Error(err));
    }else{
      outputCount ++;
      jobProgress += 50/maxCount;
      job.progress(Math.floor(jobProgress));
      if(outputCount == maxCount){
        makeZip(job, done, dstPath, folderPathTmp);
      }
    }
  });

  // Copy Document Folder
  fs.copy(`./documents/${competitionId}`, `${folderPathTmp}/documents`, (err) => {
    if(err){
      done(new Error(err));
    }else{
      glob.glob(`${folderPathTmp}/documents/**/trash/*`, function(err, trash){
        trash.forEach(function(file){
          fs.unlinkSync(file);
        });
        outputCount ++;
        jobProgress += 50/maxCount;
        job.progress(Math.floor(jobProgress));
        if(outputCount == maxCount){
          makeZip(job, done, dstPath, folderPathTmp);
        }
      });
    }
  });

  // Copy Cabinet Folder
  fs.copy(`./cabinet/${competitionId}`, `${folderPathTmp}/cabinet`, (err) => {
    if(err){
      done(new Error(err));
    }else{
      outputCount ++;
      jobProgress += 50/maxCount;
      job.progress(Math.floor(jobProgress));
      if(outputCount == maxCount){
        makeZip(job, done, dstPath, folderPathTmp);
      }
    }
  });

  // Copy Suevey Folder
  fs.copy(`./survey/${competitionId}`, `${folderPathTmp}/survey`, (err) => {
    if(err){
      done(new Error(err));
    }else{
      outputCount ++;
      jobProgress += 50/maxCount;
      job.progress(Math.floor(jobProgress));
      if(outputCount == maxCount){
        makeZip(job, done, dstPath, folderPathTmp);
      }
    }
  });
  
  if (fs.existsSync(`./mailAttachment/${competitionId}`)) {
    // Copy Mail Attachment Folder
    fs.copy(`./mailAttachment/${competitionId}`, `${folderPathTmp}/mailAttachment`, (err) => {
      if(err){
        done(new Error(err));
      }else{
        outputCount ++;
        jobProgress += 50/maxCount;
        job.progress(Math.floor(jobProgress));
        if(outputCount == maxCount){
          makeZip(job, done, dstPath, folderPathTmp);
        }
      }
    });
  } else {
    outputCount ++;
    jobProgress += 50/maxCount;
    job.progress(Math.floor(jobProgress));
    if(outputCount == maxCount){
      makeZip(job, done, dstPath, folderPathTmp);
    }
  }

  //Competition data
  competitiondb.competition
  .find({'_id': competitionId})
  .select('name rule logo bkColor color message description ranking documents registration consentForm leagues')
  .lean()
  .exec(function (err, data) {
    if (err) {
      done(new Error(err));
    } else {
      fs.writeFile(`${folderPathTmp}/competition.json`, JSON.stringify(data), (err) => {
        if(err){
          done(new Error(err));
        }else{
          outputCount ++;
          jobProgress += 50/maxCount;
          job.progress(Math.floor(jobProgress));
          if(outputCount == maxCount){
            makeZip(job, done, dstPath, folderPathTmp);
          }
        }
      });
    }
  });

  //User data
  userdb.user
  .find()
  .lean()
  .exec(function (err, data) {
    if (err) {
      done(new Error(err));
    } else {
      let users = data.filter(d => 
        d.superDuperAdmin ||
        d.competitions.some(dd => 
          dd.id.toString() == competitionId && dd.accessLevel > 0
        )
      )
      fs.writeFile(`${folderPathTmp}/users.json`, JSON.stringify(users), (err) => {
        if(err){
          done(new Error(err));
        }else{
          outputCount ++;
          jobProgress += 50/maxCount;
          job.progress(Math.floor(jobProgress));
          if(outputCount == maxCount){
            makeZip(job, done, dstPath, folderPathTmp);
          }
        }
      });
    }
  });

  function backup(file, Model){
    Model
    .find({'competition': competitionId})
    .lean()
    .select(Object.keys(Model.schema.tree))
    .exec(function (err, data) {
      if (err) {
        done(new Error(err));
      } else {
        fs.writeFile(`${folderPathTmp}/${file}.json`, JSON.stringify(data), (err) => {
          if(err){
            done(new Error(err));
          }else{
            outputCount ++;
            jobProgress += 50/maxCount;
            job.progress(Math.floor(jobProgress));
            if(outputCount == maxCount){
              makeZip(job, done, dstPath, folderPathTmp);
            }
          }
        });
      }
    });
  }
  
  backup('round', competitiondb.round);
  backup('team', competitiondb.team);
  backup('field', competitiondb.field);
  backup('technicalChallenge', competitiondb.technicalChallenge);
  backup('review', documentDb.review);
  backup('lineMap', lineMapDb.lineMap);
  backup('lineRun', lineRunDb.lineRun);
  backup('mazeMap', mazeMapDb.mazeMap);
  backup('mazeRun', mazeRunDb.mazeRun);
  backup('simRum', simRunDb.simRun);
  backup('mail', mailDb.mail);
  backup('reservation', reservationDb.reservation);
  backup('survey', surveyDb.survey);
  backup('surveyAnswer', surveyDb.surveyAnswer);             
});

function makeZip(job, done, dstPath, folderPathTmp) {
  let firstProgress = job._progress;
  const output = fs.createWriteStream(dstPath);
  const archive = archiver('zip', {
    zlib: { level: 0 }, // Sets the compression level.
  });

  archive.on("progress", (progress) => {
    job.progress(Math.floor(firstProgress + (progress.fs.processedBytes / progress.fs.totalBytes) * (100 - firstProgress)));
  })

  output.on('close', function () {
    rimraf(folderPathTmp, (err) => {
      if(err){
        done(new Error(err));
      }else{
        job.progress(100);
        done();
      }
    });
  });

  archive.pipe(output);
  archive.directory(folderPathTmp, false);
  archive.finalize();
}


function cleanup(job){
  if(job.name == 'backup'){
    if (b_keep && b_keep != 0) {
      glob.glob(`./backup/${job.data.competitionId}/_*.cms`, function(err, files){
        files = files.slice(0, b_keep * -1);
        for(let f of files) {
          fs.unlinkSync(f);
        }   
      });
    }
  }else if(job.name = 'restore'){
    rimraf(`./tmp/uploads/${job.data.folder}`, function (err) {
    });
    fs.unlink(`./tmp/uploads/${job.data.folder}.zip`, function (err) {
    });
  }
}

backupQueue.on('completed', function(job, result) {
  cleanup(job);
});

backupQueue.on('failed', function(job, err) {
  cleanup(job);
});


backupQueue.process('restore', function(job, done){
  job.progress(1);
  const {folder, user} = job.data;
  const maxCount = 21;

  const extract = onezip.extract(`./tmp/uploads/${folder}.zip`, `./tmp/uploads/${folder}`);

  extract.on('progress', (percent) => {
    job.progress(Math.floor((percent/100) * 50));
  });

  extract.on('error', (error) => {
    done(new Error(error));
  });

  extract.on('end', () => {
    job.progress(50);
    let jobProgress = 50;

    const version = JSON.parse(
      fs.readFileSync(
        `${base_tmp_path}uploads/${folder}/version.json`,
        'utf8'
      )
    );
    if (version.version != Bversion) {
      done(new Error(`It is expected that the backup data is Version: ${Bversion}, but the file entered is Version: ${version.version}.`));
    }else{
      let updated = 0;
      jobProgress += 50/maxCount;
      job.progress(Math.floor(jobProgress));

      //Competition
      const competition = JSON.parse(
        fs.readFileSync(
          `${base_tmp_path}uploads/${folder}/competition.json`,
          'utf8'
        )
      );
      job.update({
        folder,
        user,
        competitionId: competition[0]._id
      });
      competitiondb.competition.updateOne(
        { _id: competition[0]._id },
        competition[0],
        { upsert: true },
        function (err) {
          if (err) {
            done(new Error(err));
          } else {
            updated ++;
            jobProgress += 50/maxCount;
            job.progress(Math.floor(jobProgress));
            if(updated == maxCount){
              job.progress(100);
              done();
            }
          }
        }
      );

      function restore(fileName, Model){
        let path = `${base_tmp_path}uploads/${folder}/${fileName}.json`
        if (fs.existsSync(path)) {
          const json = JSON.parse(
            fs.readFileSync(
              path,
              'utf8'
            )
          );
          const bulkOps = json.map(item => ({
            updateOne: {
                filter: {_id: item._id},
                update: item,
                upsert: true
            }
          }));
          Model.bulkWrite(bulkOps,
            function (err) {
              if (err) {
                done(new Error(err));
              } else {
                updated ++;
                jobProgress += 50/maxCount;
                job.progress(Math.floor(jobProgress));
                if(updated == maxCount){
                  job.progress(100);
                  done();
                }
              }
            }
          );
        } else {
          updated ++;
          jobProgress += 50/maxCount;
          job.progress(Math.floor(jobProgress));
          if(updated == maxCount){
            job.progress(100);
            done();
          }
        }
      }

      restore('team', competitiondb.team);
      restore('field', competitiondb.field);
      restore('round', competitiondb.round);
      restore('technicalChallenge', competitiondb.technicalChallenge);
      restore('lineMap', lineMapDb.lineMap);
      restore('lineRun', lineRunDb.lineRun);
      restore('mazeMap', mazeMapDb.mazeMap);
      restore('mazeRun', mazeRunDb.mazeRun);
      restore('simRun', simRunDb.simRun);
      restore('mail', mailDb.mail);
      restore('reservation', reservationDb.reservation);
      restore('review', documentDb.review);
      restore('survey', surveyDb.survey);
      restore('surveyAnswer', surveyDb.surveyAnswer);
      restore('users', userdb.user);

      // Copy Document Folder
      fs.copy(`${base_tmp_path}uploads/${folder}/documents`, `${__dirname}/../documents/${competition[0]._id}`, (err) => {
        chmodr(
          `${__dirname}/../documents/${competition[0]._id}`,
          0o777,
          (err) => {
            if (err) {
              done(new Error(err));
            }else{
              updated ++;
              jobProgress += 50/maxCount;
              job.progress(Math.floor(jobProgress));
              if(updated == maxCount){
                job.progress(100);
                done();
              }
            }
          }
        );
      });

      // Copy Cabinet Folder
      fs.copy(`${base_tmp_path}uploads/${folder}/cabinet`, `${__dirname}/../cabinet/${competition[0]._id}`, (err) => {
        chmodr(
          `${__dirname}/../cabinet/${competition[0]._id}`,
          0o777,
          (err) => {
            if (err) {
              done(new Error(err));
            }else{
              updated ++;
              jobProgress += 50/maxCount;
              job.progress(Math.floor(jobProgress));
              if(updated == maxCount){
                job.progress(100);
                done();
              }
            }
          }
        );
      });

      // Copy Survey Folder
      fs.copy(`${base_tmp_path}uploads/${folder}/survey`, `${__dirname}/../survey/${competition[0]._id}`, (err) => {
        chmodr(
          `${__dirname}/../survey/${competition[0]._id}`,
          0o777,
          (err) => {
            if (err) {
              done(new Error(err));
            }else{
              updated ++;
              jobProgress += 50/maxCount;
              job.progress(Math.floor(jobProgress));
              if(updated == maxCount){
                job.progress(100);
                done();
              }
            }
          }
        );
      });

      // Copy MailAttachment Folder
      if (fs.existsSync(`${base_tmp_path}uploads/${folder}/mailAttachment`)) {
        fs.copy(`${base_tmp_path}uploads/${folder}/mailAttachment`, `${__dirname}/../mailAttachment/${competition[0]._id}`, (err) => {
          chmodr(
            `${__dirname}/../mailAttachment/${competition[0]._id}`,
            0o777,
            (err) => {
              if (err) {
                done(new Error(err));
              }else{
                updated ++;
                jobProgress += 50/maxCount;
                job.progress(Math.floor(jobProgress));
                if(updated == maxCount){
                  job.progress(100);
                  done();
                }
              }
            }
          );
        });
      } else {
        updated ++;
        jobProgress += 50/maxCount;
        job.progress(Math.floor(jobProgress));
        if(updated == maxCount){
          job.progress(100);
          done();
        }
      }
      
      userdb.user.findById(user._id).exec(function (err, dbUser) {
        if (err) {
          logger.error(err);
        } else if (dbUser) {
          if(dbUser.competitions.some(c => c.id == competition[0]._id)){
            for(let c of dbUser.competitions){
              if(c.id == competition[0]._id) c.accessLevel = ACCESSLEVELS.ADMIN;
            }
            dbUser.save(function (err) {
              if (err) {
                logger.error(err);
              }else{
                updated ++;
                jobProgress += 50/maxCount;
                job.progress(Math.floor(jobProgress));
                if(updated == maxCount){
                  job.progress(100);
                  done();
                }
              }
            });
          }else{
            const newData = {
              id: competition[0]._id,
              accessLevel: ACCESSLEVELS.ADMIN,
            };
            dbUser.competitions.push(newData);
  
            dbUser.save(function (err) {
              if (err) {
                logger.error(err);
              }else{
                updated ++;
                jobProgress += 50/maxCount;
                job.progress(Math.floor(jobProgress));
                if(updated == maxCount){
                  job.progress(100);
                  done();
                }
              }
            });
          }
        }
      });
    }
  });
});

exports.backupQueue = backupQueue;
// Backup competitions in interval
if (b_interval && b_interval != 0) {
    setInterval(() => {
        competitiondb.competition
          .find()
          .select("_id")
          .lean()
          .exec(async function (err, data) {
            for (let d of data) {
              backupQueue.add('backup',{
                'competitionId': d._id,
                'mode': 'auto'
              });
            }
          });
    }, 1000 * 3600 * b_interval);
}