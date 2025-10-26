const express = require("express");
const path = require("path"); // Add this line
// Import child_process to run python code
const { exec } = require("child_process");
const { MongoClient } = require("mongodb");
const fs = require('fs');
const app = express();
const port = 3000;

// === Add JSON body parser (needed for screenshot POST) ===
app.use(express.json({ limit: '15mb' }));

const SCREENSHOT_DIR = path.join(__dirname, 'public', 'screenshots', 'index_sleep', 'sleep_today_sleeplog_by_date');
if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

function validDate(d){ return /^\d{4}-\d{2}-\d{2}$/.test(d); }

// OPTIONAL: if you need simple CORS (same-origin fetch doesn’t need it, can remove)
app.use((req,res,next)=>{
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Serve static files from the 'public' directory
app.use(express.static("public"));

// Serve HTML files from the 'public/html' directory
app.use(express.static(path.join(__dirname, "public/html")));

// MongoDB Connection URL
const url = "mongodb://localhost:27017";
const client = new MongoClient(url, { useUnifiedTopology: true });
const dbName = "fitbit";

// Connect to MongoDB once and reuse the connection
async function main() {
  try {
    await client.connect();
    console.log("Connected to MongoDB");
    const db = client.db(dbName);

    /////////// BR - Breathing Rate
    app.get("/api/br", async (req, res) => {
      let { start, end } = req.query;
      const today = new Date();
      today.setHours(0,0,0,0);
      const todayEnd = new Date();
      todayEnd.setHours(23,59,59,999);

      const startDate = start ? new Date(start) : today;
      const endDate = end ? new Date(end) : todayEnd;

      try {
        const collection = client.db(dbName).collection("br_by_date");
        const pipeline = [
          { $match: {
              date: {
                $gte: startDate.toISOString().substring(0,10),
                $lte: endDate.toISOString().substring(0,10)
              },
              fullSleepBr: { $gt: 5, $lt: 20 },
              remSleepBr: { $gt: 5, $lt: 20 },
              deepSleepBr: { $gt: 5, $lt: 20 },
              lightSleepBr: { $gt: 5, $lt: 20 },
            }
          },
          { $project: {
              date:1,
              fullSleepBr:1,
              remSleepBr:1,
              deepSleepBr:1,
              lightSleepBr:1,
              _id:0
            }
          }
        ];
        const data = await collection.aggregate(pipeline).toArray();
        console.log(`Breathing Rate data ${startDate.toISOString()} -> ${endDate.toISOString()} records=${data.length}`);
        res.json(data);
      } catch (e) {
        console.error("Error fetching Breathing Rate data:", e);
        res.status(500).json({ error: e.message });
      }
    });

    /////////// HR - Heart Rate
    app.get("/api/hr", async (req, res) => {
      let { start, end } = req.query;
      // Set defaults to today's date if not provided
      let today = new Date();
      today.setHours(0, 0, 0, 0); // Start of today
      let todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999); // End of today

      const startDate = start ? new Date(start) : today;
      const endDate = end ? new Date(end) : todayEnd;

      // Calculate age from DOB (1965-08-10)
      const dob = new Date("1965-08-10");
      const currentDate = new Date();
      let userAge = currentDate.getFullYear() - dob.getFullYear();
      const monthDiff = currentDate.getMonth() - dob.getMonth();
      if (
        monthDiff < 0 ||
        (monthDiff === 0 && currentDate.getDate() < dob.getDate())
      ) {
        userAge--;
      }

      try {
        const collection = db.collection("hr_intraday_by_date");
        const pipeline = [
          {
            $match: {
              date: {
                $gte: startDate.toISOString().substring(0, 10),
                $lte: endDate.toISOString().substring(0, 10),
              },
            },
          },
          {
            $unwind: "$measurements",
          },
          {
            $project: {
              date: 1,
              restingHeartRate: 1,
              dateTime: "$measurements.dateTime",
              heartRate: "$measurements.heartRate",
              _id: 0,
            },
          },
        ];
        const data = await collection.aggregate(pipeline).toArray();

        // Calculate MAF heart rate zone (180 - age)
        const mafHR = 180 - userAge;
        const mafLowerBound = mafHR - 10;

        // Calculate MAF zone minutes
        const heartRates = data.map((item) => item.heartRate);
        const mafAerobicMinutes = heartRates.filter((hr) => hr <= mafHR).length;
        const mafZoneMinutes = heartRates.filter(
          (hr) => hr >= mafLowerBound && hr <= mafHR
        ).length;

        // Calculate time intervals (same logic as frontend)
        const dates = data.map((item) => new Date(item.dateTime));
        if (dates.length > 1) {
          const totalMinutes =
            (dates[dates.length - 1] - dates[0]) / (1000 * 60);
          const minutesPerDataPoint = totalMinutes / (dates.length - 1);

          const mafAerobicHours = parseFloat(
            ((mafAerobicMinutes * minutesPerDataPoint) / 60).toFixed(2)
          );
          const mafZoneHours = parseFloat(
            ((mafZoneMinutes * minutesPerDataPoint) / 60).toFixed(2)
          );

          console.log(
            `HR data from ${startDate.toISOString()} to ${endDate.toISOString()}. Records: ${
              data.length
            }`
          );

          res.json({
            heartRateData: data.map((item) => ({
              dateTime: item.dateTime,
              heartRate: item.heartRate,
              restingHeartRate: item.restingHeartRate,
            })),
            mafData: {
              mafHR: mafHR,
              mafLowerBound: mafLowerBound,
              mafAerobicHours: mafAerobicHours, // All time <= MAF HR
              mafZoneHours: mafZoneHours, // Time in MAF-10 to MAF range
              userAge: userAge,
            },
          });
        } else {
          res.json({
            heartRateData: data.map((item) => ({
              dateTime: item.dateTime,
              heartRate: item.heartRate,
              restingHeartRate: item.restingHeartRate,
            })),
            mafData: {
              mafHR: mafHR,
              mafLowerBound: mafLowerBound,
              mafAerobicHours: 0,
              mafZoneHours: 0,
              userAge: userAge,
            },
          });
        }
      } catch (error) {
        console.error("Error fetching HR data: ", error);
        res.status(500).send("Error fetching HR data: " + error.message);
      }
    });

    /////////// HR - Heart Rate Zones
    app.get("/api/hr_zones", async (req, res) => {
      let { start, end } = req.query;
      // Set defaults to today's date if not provided
      let today = new Date();
      today.setHours(0, 0, 0, 0); // Start of today
      let todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999); // End of today

      const startDate = start ? new Date(start) : today;
      const endDate = end ? new Date(end) : todayEnd;

      try {
        const collection = db.collection("hr_intraday_by_date");
        const pipeline = [
          {
            $match: {
              date: {
                $gte: startDate.toISOString().substring(0, 10),
                $lte: endDate.toISOString().substring(0, 10),
              },
            },
          },
          {
            $unwind: "$hrZones",
          },
          {
            $project: {
              date: 1,
              restingHeartRate: 1,
              dailyAverage: 1,
              hrBinRange: "$hrZones.hrBinRange",
              count: "$hrZones.count",
              _id: 0,
            },
          },
        ];
        const data = await collection.aggregate(pipeline).toArray();
        console.log(
          `HR Zones data from ${startDate.toISOString()} to ${endDate.toISOString()}. Records: ${
            data.length
          }`
        );
        res.json(
          data.map((item) => ({
            date: item.date,
            restingHeartRate: item.restingHeartRate,
            dailyAverage: item.dailyAverage,
            hrBinRange: item.hrBinRange,
            count: item.count,
          }))
        );
      } catch (error) {
        console.error("Error fetching HR Zones data: ", error);
        res.status(500).send("Error fetching HR Zones data: " + error.message);
      }
    });

    /////////// HRV
    app.get("/api/hrv", async (req, res) => {
      let { start, end } = req.query;
      // Set defaults to today's date if not provided
      let today = new Date();
      today.setHours(0, 0, 0, 0); // Start of today
      let todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999); // End of today

      const startDate = start ? new Date(start) : today;
      const endDate = end ? new Date(end) : todayEnd;

      try {
        const collection = db.collection("hrv_intraday_by_date");
        const pipeline = [
          {
            $match: {
              date: {
                $gte: startDate.toISOString().substring(0, 10),
                $lte: endDate.toISOString().substring(0, 10),
              },
            },
          },
          {
            $unwind: "$measurements",
          },
          {
            $project: {
              date: 1,
              dailyAverageRmssd: 1,
              dateTime: "$measurements.dateTime",
              rmssd: "$measurements.rmssd",
              rmssdBinRange: "$measurements.rmssdBinRange",
              _id: 0,
            },
          },
        ];
        const data = await collection.aggregate(pipeline).toArray();
        console.log(
          `HRV data from ${startDate.toISOString()} to ${endDate.toISOString()}. Records: ${
            data.length
          }`
        );
        res.json(data);
      } catch (error) {
        console.error("Error fetching HRV data: ", error);
        res.status(500).send("Error fetching HRV data: " + error.message);
      }
    });

    /////////// HRV by document date
    app.get("/api/hrv_daily", async (req, res) => {
      let { start, end } = req.query;
      // Set defaults to today's date if not provided
      let today = new Date();
      today.setHours(0, 0, 0, 0); // Start of today
      let todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999); // End of today

      const startDate = start ? new Date(start) : today;
      const endDate = end ? new Date(end) : todayEnd;

      try {
        const collection = db.collection("hrv_intraday_by_date");
        const pipeline = [
          {
            $match: {
              date: {
                $gte: startDate.toISOString().substring(0, 10),
                $lte: endDate.toISOString().substring(0, 10),
              },
              dailyMaxRmssd: {
                $lt: 125,
              },
            },
          },
          {
            $project: {
              date: 1,
              dailyAverageRmssd: 1,
              dailyMaxRmssd: 1,
              dailyMinRmssd: 1,
              _id: 0,
            },
          },
        ];
        const data = await collection.aggregate(pipeline).toArray();
        console.log(
          `HRV daily data from ${startDate.toISOString()} to ${endDate.toISOString()}. Records: ${
            data.length
          }`
        );
        res.json(data);
      } catch (error) {
        console.error("Error fetching HRV daily data: ", error);
        res.status(500).send("Error fetching HRV daily data: " + error.message);
      }
    });

    /////////// Sleeplog
    app.get("/api/sleeplog", async (req, res) => {
      let { start, end } = req.query;
      // Set defaults to today's date if not provided
      let today = new Date();
      today.setHours(0, 0, 0, 0); // Start of today
      let todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999); // End of today

      const startDate = start ? new Date(start) : today;
      const endDate = end ? new Date(end) : todayEnd;

      try {
        const collection = db.collection("sleeplog_by_date");
        const pipeline = [
          {
            $match: {
              date: {
                $gte: startDate.toISOString().substring(0, 10),
                $lte: endDate.toISOString().substring(0, 10),
              },
            },
          },
          {
            $facet: {
              data: [
                { $unwind: "$levels.data" },
                {
                  $addFields: {
                    segment_end_time: {
                      $dateAdd: {
                        startDate: { $toDate: "$levels.data.dateTime" },
                        unit: "second",
                        amount: "$levels.data.seconds",
                      },
                    },
                    segment_start_time: { $toDate: "$levels.data.dateTime" },
                    level: "$levels.data.level",
                    seconds: "$levels.data.seconds",
                  },
                },
                {
                  $project: {
                    segment_start_time: 1,
                    segment_end_time: 1,
                    level: 1,
                    seconds: 1,
                  },
                },
              ],
              shortData: [
                { $unwind: "$levels.shortData" },
                {
                  $addFields: {
                    segment_end_time: {
                      $dateAdd: {
                        startDate: { $toDate: "$levels.shortData.dateTime" },
                        unit: "second",
                        amount: "$levels.shortData.seconds",
                      },
                    },
                    segment_start_time: {
                      $toDate: "$levels.shortData.dateTime",
                    },
                    level: { $concat: ["short_", "$levels.shortData.level"] },
                    seconds: "$levels.shortData.seconds",
                  },
                },
                {
                  $project: {
                    segment_start_time: 1,
                    segment_end_time: 1,
                    level: 1,
                    seconds: 1,
                  },
                },
              ],
            },
          },
          {
            $project: {
              allData: { $concatArrays: ["$data", "$shortData"] },
            },
          },
          {
            $unwind: "$allData",
          },
          {
            $replaceRoot: { newRoot: "$allData" },
          },
        ];
        const data = await collection.aggregate(pipeline).toArray();
        console.log(
          `Sleeplog data from ${startDate.toISOString()} to ${endDate.toISOString()}. Records: ${
            data.length
          }`
        );

        res.json(data);
      } catch (error) {
        console.error("Error fetching Sleeplog data: ", error);
        res.status(500).send("Error fetching Sleeplog data: " + error.message);
      }
    });

    // Sleeplog Daily
    app.get("/api/sleeplog_daily", async (req, res) => {
      let { start, end } = req.query;
      // Set defaults to today's date if not provided
      let today = new Date();
      today.setHours(0, 0, 0, 0); // Start of today
      let todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999); // End of today

      const startDate = start ? new Date(start) : today;
      const endDate = end ? new Date(end) : todayEnd;

      try {
        const collection = db.collection("sleeplog_by_date");
        const pipeline = [
          {
            $match: {
              date: {
                $gte: startDate.toISOString().substring(0, 10),
                $lte: endDate.toISOString().substring(0, 10),
              },
            },
          },
          {
            $project: {
              date: 1,
              minutesAsleep: 1,
              minutesAwake: 1,
              minutesToFallAsleep: 1,
              minutesAfterWakeup: 1,
              timeInBed: 1,
              startTime: 1,
              endTime: 1,
              efficiency: 1,
              duration: 1,
              minutesDeep: 1,
              minutesRem: 1,
              minutesLight: 1,
              minutesDeepAvg30day: 1,
              minutesRemAvg30day: 1,
              minutesLightAvg30day: 1,
            },
          },
        ];
        const data = await collection.aggregate(pipeline).toArray();
        console.log(
          `Sleeplog daily data from ${startDate.toISOString()} to ${endDate.toISOString()}. Records: ${
            data.length
          }`
        );

        res.json(data);
      } catch (error) {
        console.error("Error fetching Sleeplog daily data: ", error);
        res
          .status(500)
          .send("Error fetching Sleeplog daily data: " + error.message);
      }
    });

    // Sleeplog Summary - Extract summary minutes from Fitbit data
    app.get("/api/sleeplog_summary", async (req, res) => {
      let { start, end } = req.query;
      // Set defaults to today's date if not provided
      let today = new Date();
      today.setHours(0, 0, 0, 0); // Start of today
      let todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999); // End of today

      const startDate = start ? new Date(start) : today;
      const endDate = end ? new Date(end) : todayEnd;

      try {
        const collection = db.collection("sleeplog_by_date");
        const pipeline = [
          {
            $match: {
              date: {
                $gte: startDate.toISOString().substring(0, 10),
                $lte: endDate.toISOString().substring(0, 10),
              },
            },
          },
          {
            $project: {
              date: 1,
              // Handle newer devices with detailed sleep stages
              minutesDeep: "$levels.summary.deep.minutes",
              minutesLight: "$levels.summary.light.minutes",
              minutesRem: "$levels.summary.rem.minutes",
              // Handle both 'wake' and 'awake' labels and combine them
              minutesAwake: {
                $add: [
                  { $ifNull: ["$levels.summary.wake.minutes", 0] },
                  { $ifNull: ["$levels.summary.awake.minutes", 0] },
                ],
              },
              // Handle older devices with basic sleep/awake data
              minutesAsleep: "$levels.summary.asleep.minutes",
              minutesRestless: "$levels.summary.restless.minutes",
              _id: 0,
            },
          },
        ];
        const data = await collection.aggregate(pipeline).toArray();
        console.log(
          `Sleeplog summary data from ${startDate.toISOString()} to ${endDate.toISOString()}. Records: ${
            data.length
          }`
        );

        res.json(data);
      } catch (error) {
        console.error("Error fetching Sleeplog summary data: ", error);
        res
          .status(500)
          .send("Error fetching Sleeplog summary data: " + error.message);
      }
    });

    /////////// SpO2 by measurement datetime
    app.get("/api/spo2", async (req, res) => {
      let { start, end } = req.query;
      // Set defaults to today's date if not provided
      let today = new Date();
      today.setHours(0, 0, 0, 0); // Start of today
      let todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999); // End of today

      const startDate = start ? new Date(start) : today;
      const endDate = end ? new Date(end) : todayEnd;

      try {
        const collection = db.collection("spo2_intraday_by_date");
        const pipeline = [
          {
            $match: {
              date: {
                $gte: startDate.toISOString().substring(0, 10),
                $lte: endDate.toISOString().substring(0, 10),
              },
            },
          },
          {
            $unwind: "$measurements",
          },
          {
            $project: {
              date: 1,
              dailyAvg: 1,
              dateTime: "$measurements.dateTime",
              spo2: "$measurements.spo2",
              _id: 0,
            },
          },
        ];
        const data = await collection.aggregate(pipeline).toArray();
        console.log(
          `SpO2 data from ${startDate.toISOString()} to ${endDate.toISOString()}. Records: ${
            data.length
          }`
        );
        res.json(data);
      } catch (error) {
        console.error("Error fetching SpO2 data: ", error);
        res.status(500).send("Error fetching SpO2 data: " + error.message);
      }
    });

    /////////// SpO2 by document date
    app.get("/api/spo2_daily", async (req, res) => {
      let { start, end } = req.query;
      // Set defaults to today's date if not provided
      let today = new Date();
      today.setHours(0, 0, 0, 0); // Start of today
      let todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999); // End of today

      const startDate = start ? new Date(start) : today;
      const endDate = end ? new Date(end) : todayEnd;

      try {
        const collection = db.collection("spo2_intraday_by_date");
        const pipeline = [
          {
            $match: {
              date: {
                $gte: startDate.toISOString().substring(0, 10),
                $lte: endDate.toISOString().substring(0, 10),
              },
            },
          },
          {
            $project: {
              date: 1,
              dailyAvg: 1,
              dailyMax: 1,
              dailyMin: 1,
              _id: 0,
            },
          },
        ];
        const data = await collection.aggregate(pipeline).toArray();
        console.log(
          `SpO2 daily data from ${startDate.toISOString()} to ${endDate.toISOString()}. Records: ${
            data.length
          }`
        );
        res.json(data);
      } catch (error) {
        console.error("Error fetching SpO2 daily data: ", error);
        res
          .status(500)
          .send("Error fetching SpO2 daily data: " + error.message);
      }
    });

    /////////// Steps Hourly and Cumulative
    app.get("/api/steps_hourly", async (req, res) => {
      let { start, end } = req.query;
      const startDate = start
        ? new Date(start)
        : new Date(new Date().setHours(0, 0, 0, 0));
      const endDate = end
        ? new Date(end)
        : new Date(new Date().setHours(23, 59, 59, 999));

      try {
        const collection = db.collection("steps_intraday_by_date");
        const pipeline = [
          {
            $match: {
              date: {
                $gte: startDate.toISOString().substring(0, 10),
                $lte: endDate.toISOString().substring(0, 10),
              },
            },
          },
          {
            $unwind: "$measurements",
          },
          {
            $project: {
              date: 1,
              totalSteps: 1,
              hourGt250Steps: 1,
              hour: { $hour: "$measurements.dateTime" },
              steps: "$measurements.steps",
            },
          },
          {
            $group: {
              _id: {
                date: "$date",
                hour: "$hour",
              },
              steps: { $sum: "$steps" },
              totalSteps: { $first: "$totalSteps" },
              hourGt250Steps: { $first: "$hourGt250Steps" },
            },
          },
          {
            $sort: { "_id.date": 1, "_id.hour": 1 },
          },
          {
            $project: {
              _id: 0,
              date: "$_id.date",
              hour: "$_id.hour",
              dateTime: {
                $concat: [
                  "$_id.date",
                  " ",
                  { $toString: "$_id.hour" },
                  ":00:00",
                ],
              },
              steps: 1,
              totalSteps: 1,
              hourGt250Steps: 1,
            },
          },
        ];
        const data = await collection.aggregate(pipeline).toArray();
        console.log(
          `Steps Hourly data from ${startDate.toISOString()} to ${endDate.toISOString()}. Records: ${
            data.length
          }`
        );
        res.json(calculateCumulativeSteps(data));
      } catch (error) {
        console.error("Error fetching Steps Hourly data: ", error);
        res
          .status(500)
          .send("Error fetching Steps Hourly data: " + error.message);
      }
    });

    function calculateCumulativeSteps(data) {
      let cumulative = 0;
      let currentDate = "";
      let results = [];

      data.forEach((item, index) => {
        // Use the new date field directly
        const dateStr = item.date;
        if (currentDate !== dateStr) {
          if (currentDate !== "") {
            // Insert a null entry at the end of the previous day
            results.push({
              dateTime: `${currentDate} 23:59:00`,
              date: null,
              steps: null,
              totalSteps: null,
              hourGt250Steps: null,
              cumulativeSteps: null,
              cumulativeStepsPct: null,
            });
          }
          currentDate = dateStr;
          cumulative = 0; // Reset cumulative total for a new date
        }

        cumulative += item.steps;

        // Calculate cumulative steps percentage
        const cumulativeStepsPct =
          item.totalSteps > 0
            ? Math.ceil((cumulative / item.totalSteps) * 100)
            : 0;

        results.push({
          dateTime: item.dateTime, // Use the dateTime field we created in the pipeline
          date: item.date,
          steps: item.steps,
          totalSteps: item.totalSteps,
          hourGt250Steps: item.hourGt250Steps,
          cumulativeSteps: cumulative,
          cumulativeStepsPct: cumulativeStepsPct,
        });

        // Handle the last item to add a null at the end of the last date
        if (index === data.length - 1) {
          results.push({
            dateTime: `${dateStr} 23:59:00`,
            date: null,
            steps: null,
            totalSteps: null,
            hourGt250Steps: null,
            cumulativeSteps: null,
            cumulativeStepsPct: null,
          });
        }
      });

      return results;
    }

    /////////// Steps Daily
    app.get("/api/steps_daily", async (req, res) => {
      let { start, end } = req.query;
      const startDate = start
        ? new Date(start)
        : new Date(new Date().setHours(0, 0, 0, 0));
      const endDate = end
        ? new Date(end)
        : new Date(new Date().setHours(23, 59, 59, 999));

      try {
        const collection = db.collection("steps_intraday_by_date");
        const pipeline = [
          {
            $match: {
              date: {
                $gte: startDate.toISOString().substring(0, 10),
                $lte: endDate.toISOString().substring(0, 10),
              },
            },
          },
          {
            $project: {
              date: 1,
              totalSteps: 1,
            },
          },
        ];
        const data = await collection.aggregate(pipeline).toArray();
        console.log(
          `Steps Daily data from ${startDate.toISOString()} to ${endDate.toISOString()}. Records: ${
            data.length
          }`
        );
        res.json(
          data.map((item) => ({
            date: item.date,
            totalSteps: item.totalSteps,
          }))
        );
      } catch (error) {
        console.error("Error fetching Steps Daily data: ", error);
        res
          .status(500)
          .send("Error fetching Steps Daily data: " + error.message);
      }
    });

    /////////// RHR - Resting Heart Rate
    app.get("/api/hr_daily", async (req, res) => {
      let { start, end } = req.query;
      // Set defaults to today's date if not provided
      let today = new Date();
      today.setHours(0, 0, 0, 0); // Start of today
      let todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999); // End of today

      const startDate = start ? new Date(start) : today;
      const endDate = end ? new Date(end) : todayEnd;

      try {
        const collection = db.collection("hr_intraday_by_date");
        const pipeline = [
          {
            $match: {
              date: {
                $gte: startDate.toISOString().substring(0, 10),
                $lte: endDate.toISOString().substring(0, 10),
              },
              // dailyMin: {
              //   $gt: 39,
              // },
            },
          },
          {
            $project: {
              date: 1,
              restingHeartRate: 1,
              dailyAverage: 1,
              dailyMax: 1,
              dailyMin: 1,
              _id: 0,
            },
          },
        ];
        const data = await collection.aggregate(pipeline).toArray();
        console.log(
          `RHR data from ${startDate.toISOString()} to ${endDate.toISOString()}. Records: ${
            data.length
          }`
        );
        res.json(
          data.map((item) => ({
            date: item.date,
            restingHeartRate: item.restingHeartRate,
            dailyAverage: item.dailyAverage,
            dailyMax: item.dailyMax,
            dailyMin: item.dailyMin,
          }))
        );
      } catch (error) {
        console.error("Error fetching RHR data: ", error);
        res.status(500).send("Error fetching RHR data: " + error.message);
      }
    });

    /////////// VO2Max
    app.get("/api/vo2max", async (req, res) => {
      let { start, end } = req.query;
      // Set defaults to today's date if not provided
      let today = new Date();
      today.setHours(0, 0, 0, 0); // Start of today
      let todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999); // End of today

      const startDate = start ? new Date(start) : today;
      const endDate = end ? new Date(end) : todayEnd;

      try {
        const collection = db.collection("vo2max_by_date");
        const pipeline = [
          {
            $match: {
              date: {
                $gte: startDate.toISOString().substring(0, 10),
                $lte: endDate.toISOString().substring(0, 10),
              },
            },
          },
          {
            $project: {
              date: 1,
              vo2MaxHigh: 1,
              vo2MaxLow: 1,
              _id: 0,
            },
          },
        ];
        const data = await collection.aggregate(pipeline).toArray();
        console.log(
          `VO2 Max data from ${startDate.toISOString()} to ${endDate.toISOString()}. Records: ${
            data.length
          }`
        );
        res.json(data);
      } catch (error) {
        console.error("Error fetching VO2 Max data: ", error);
        res.status(500).send("Error fetching VO2 Max data: " + error.message);
      }
    });

    /////////// BP - Blood Pressure Daily
    app.get("/api/bp_daily", async (req, res) => {
      let { start, end } = req.query;
      // Set defaults to today's date if not provided
      let today = new Date();
      today.setHours(0, 0, 0, 0); // Start of today
      let todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999); // End of today

      const startDate = start ? new Date(start) : today;
      const endDate = end ? new Date(end) : todayEnd;

      try {
        const collection = db.collection("bp_by_date");

        // Let's also check what devices we have
        const distinctDevices = await collection.distinct("device");
        console.log("Distinct devices in collection:", distinctDevices);

        const pipeline = [
          {
            $match: {
              date: {
                $gte: startDate.toISOString().substring(0, 10),
                $lte: endDate.toISOString().substring(0, 10),
              },
            },
          },
          {
            $group: {
              _id: { date: "$date", device: "$device" }, // Group by date AND device
              avgSystolic: { $avg: "$systolic" },
              minSystolic: { $min: "$systolic" },
              maxSystolic: { $max: "$systolic" },
              avgDiastolic: { $avg: "$diastolic" },
              minDiastolic: { $min: "$diastolic" },
              maxDiastolic: { $max: "$diastolic" },
              avgHeartRate: { $avg: "$heartRate" },
              minHeartRate: { $min: "$heartRate" },
              maxHeartRate: { $max: "$heartRate" },
              readings: { $sum: 1 }, // Count readings per day
              deviceValues: { $addToSet: "$device" }, // Debug: collect all device values
            },
          },
          {
            $project: {
              _id: 0,
              date: "$_id.date",
              device: "$_id.device",
              systolic: {
                avg: { $round: ["$avgSystolic", 1] },
                min: "$minSystolic",
                max: "$maxSystolic",
              },
              diastolic: {
                avg: { $round: ["$avgDiastolic", 1] },
                min: "$minDiastolic",
                max: "$maxDiastolic",
              },
              heartRate: {
                avg: { $round: ["$avgHeartRate", 1] },
                min: "$minHeartRate",
                max: "$maxHeartRate",
              },
              readings: 1,
              deviceValues: 1, // Debug: include collected device values
            },
          },
          {
            $sort: { date: 1 }, // Sort results by date
          },
        ];

        const data = await collection.aggregate(pipeline).toArray();
        console.log(
          `BP Daily data from ${startDate.toISOString()} to ${endDate.toISOString()}. Records: ${
            data.length
          }`
        );
        res.json(data);
      } catch (error) {
        console.error("Error fetching BP Daily data: ", error);
        res.status(500).send("Error fetching BP Daily data: " + error.message);
      }
    });

    // /////////// BP - Blood Pressure Detailed Records
    app.get("/api/bp_detail", async (req, res) => {
      let { start, end } = req.query;
      // Set defaults to today's date if not provided
      let today = new Date();
      today.setHours(0, 0, 0, 0); // Start of today
      let todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999); // End of today

      const startDate = start ? new Date(start) : today;
      const endDate = end ? new Date(end) : todayEnd;

      try {
        const collection = db.collection("bp_by_date"); // Assuming your collection is named "bp_by_date"
        const pipeline = [
          {
            $match: {
              date: {
                $gte: startDate.toISOString().substring(0, 10),
                $lte: endDate.toISOString().substring(0, 10),
              },
            },
          },
          {
            $project: {
              _id: 0,
              date: 1,
              time: 1,
              systolic: 1,
              diastolic: 1,
              heartRate: 1,
              arm: 1,
              device: 1,
              source: 1,
            },
          },
          {
            $sort: { date: 1, time: 1 }, // Sort by date, then time
          },
        ];

        const data = await collection.aggregate(pipeline).toArray();
        res.json(data);
      } catch (error) {
        console.error("Error fetching BP Detailed data: ", error);
        res
          .status(500)
          .send("Error fetching BP Detailed data: " + error.message);
      }
    });

    // /////////// Exercise Details API Endpoint
    app.get("/api/exercise_detail", async (req, res) => {
      let { start, end } = req.query;
      // Set defaults to today's date if not provided
      let today = new Date();
      today.setHours(0, 0, 0, 0); // Start of today
      let todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999); // End of today

      const startDate = start ? new Date(start) : today;
      const endDate = end ? new Date(end) : todayEnd;

      try {
        const collection = db.collection("outlook_exercise_by_date");

        // Simple approach to check if collection exists
        if (!collection) {
          console.error("Collection 'outlook_exercise_by_date' not found");
          return res.status(404).send("Collection not found");
        }

        const pipeline = [
          {
            $match: {
              date: {
                $gte: startDate.toISOString().substring(0, 10),
                $lte: endDate.toISOString().substring(0, 10),
              },
            },
          },
          {
            $project: {
              _id: 0,
              date: 1,
              duration_minutes: 1,
              workout_type: 1,
              run_minutes: 1,
            },
          },
          {
            $sort: { date: 1 }, // Sort results by date
          },
        ];

        const data = await collection.aggregate(pipeline).toArray();
        console.log(
          `Exercise data from ${startDate.toISOString()} to ${endDate.toISOString()}. Records: ${
            data.length
          }`
        );
        res.json(data);
      } catch (error) {
        console.error("Error fetching exercise data: ", error);
        res.status(500).send("Error fetching exercise data: " + error.message);
      }
    });
    // Route to execute a Python script
    app.get("/run-python", (req, res) => {
      // Specify the path to the Python executable in the virtual environment
      const pythonExecutable =
        "C:\\Users\\bb\\Anaconda3\\envs\\venvFitbit\\python.exe";

      exec(
        `${pythonExecutable} -m etl.get_all_data`,
        { cwd: "../" },
        (error, stdout, stderr) => {
          if (error) {
            console.error(`Execution error: ${error}`);
            return res.status(500).send("Failed to run the script.");
          }
          if (stderr) {
            console.error(`Script error: ${stderr}`);
            return res.status(500).send("Script encountered an error.");
          }
          res.send("Script execution completed successfully.");
          console.log(`Script success: ${stdout}`);
        }
      );
    });

    // === ADD screenshot save route ===
    app.post('/api/save_chart', (req, res) => {
    const { baseName, date, imageDataUrl } = req.body || {};

    if (!baseName || !/^[a-zA-Z0-9_\-]+$/.test(baseName))
        return res.status(400).json({ error: 'Bad baseName' });
    if (!date || !validDate(date))
        return res.status(400).json({ error: 'Bad date (YYYY-MM-DD)' });
    if (!imageDataUrl || !imageDataUrl.startsWith('data:image/png;base64,'))
        return res.status(400).json({ error: 'Bad imageDataUrl' });

    const fileName = `${baseName}_${date.replace(/-/g,'_')}.png`;
    const filePath = path.join(SCREENSHOT_DIR, fileName);

    if (fs.existsSync(filePath)) {
        console.log(`[save_chart] exists ${fileName}`);
        return res.json({ status: 'exists', file: fileName });
    }

    const b64 = imageDataUrl.split(',')[1];
    fs.writeFile(filePath, b64, 'base64', err => {
        if (err) {
        console.error('[save_chart] write failed', err);
        return res.status(500).json({ error: 'Write failed' });
        }
        console.log(`[save_chart] saved ${fileName}`);
        res.json({ status: 'saved', file: fileName });
    });
    });
    // === END add route ===

    // List images endpoint (generic: /api/list_images?root=screenshots&dir1=index_sleep&dir2=sleep_today_sleeplog_by_date)
    app.get('/api/list_images', (req, res) => {
    const { root = 'screenshots', dir1, dir2 } = req.query;
    const segs = [root, dir1, dir2].filter(Boolean);

    // Validate segments
    if (!dir1 || !dir2) {
        return res.status(400).json({ error: 'Missing dir1 or dir2' });
    }
    if (!segs.every(s => /^[a-zA-Z0-9_\-]+$/.test(s))) {
        return res.status(400).json({ error: 'Invalid path segment' });
    }

    const targetDir = path.join(__dirname, 'public', ...segs);
    if (!targetDir.startsWith(path.join(__dirname, 'public'))) {
        return res.status(400).json({ error: 'Invalid path' });
    }

    fs.readdir(targetDir, (err, files) => {
        if (err) {
        if (err.code === 'ENOENT') return res.json({ path: segs.join('/'), files: [] });
        console.error('[list_images] error', err);
        return res.status(500).json({ error: 'Read failed' });
        }
        // Return only png files
        const pngs = files.filter(f => f.toLowerCase().endsWith('.png'));
        res.json({
        path: segs.join('/'),
        files: pngs
        });
    });
    });

    app.listen(port, () => {
      console.log(`Server is running at http://localhost:${port}`);
    });
  } catch (err) {
    console.error("Failed to connect to MongoDB", err);
    process.exit(1);
  }
}

main();

// === REMOVE the following block (it is invalid for Express):
// app.createServer((req,res)=>{ ... });
// Delete that entire block.
