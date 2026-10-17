# AI Prediction Feedback Loop System

A comprehensive system for evaluating AI predictions after matches finish and adjusting future probability confidence through calibration.

## 🎯 Overview

This system implements a feedback loop that:
1. **Stores AI predictions** when they're made
2. **Evaluates predictions** against actual match results
3. **Calibrates future predictions** based on historical performance
4. **Provides transparency** about AI reliability

## 📊 Database Schema

### AiPrediction
Stores original AI predictions for later evaluation.
- `matchId`: The match being predicted
- `marketType`: Type of market (1X2, BTTS, OVER_2_5, etc.)
- `predictedProbability`: Raw AI confidence (0.0-1.0)
- `predictedValue`: Predicted outcome (HOME, AWAY, YES, NO, etc.)
- `confidenceLevel`: Initial confidence level

### AiPredictionResult
Stores evaluation results after matches finish.
- `aiPredictionId`: Links to original prediction
- `actualOutcome`: What actually happened
- `wasCorrect`: Whether prediction was right
- `errorMargin`: Difference between prediction and reality

### AiMarketCalibration
Tracks calibration factors per market type.
- `marketType`: Market being calibrated
- `totalPredictions`: Number of predictions made
- `correctPredictions`: Number of correct predictions
- `calibrationFactor`: Applied to future predictions
- `lastUpdated`: When calibration was last updated

## 🔄 How It Works

### 1. Storing Predictions
```typescript
import { AiPredictionService } from '@/lib/ai-prediction-service'

await AiPredictionService.storePrediction({
  matchId: 'match-123',
  marketType: 'OVER_2_5',
  predictedProbability: 0.72,
  predictedValue: 'OVER',
  confidenceLevel: 0.8,
})
```

### 2. Automatic Evaluation
The settlement worker runs automatically (via cron job) to:
- Find finished matches with unevaluated predictions
- Compare predictions with actual results
- Calculate error margins
- Update calibration factors

### 3. Calibration Engine
```typescript
import { AiCalibrationEngine } from '@/lib/ai-calibration-engine'

const calibrated = await AiCalibrationEngine.getCalibratedPrediction(
  'OVER_2_5',
  0.72, // raw probability
  'OVER',
  'match-123'
)

// Returns:
// {
//   originalProbability: 0.72,
//   adjustedProbability: 0.68,
//   calibrationFactor: 0.94,
//   reliability: 63,
//   sampleSize: 156,
// }
```

### 4. Transparency UI
Display reliability information to users:
```typescript
import AiReliabilityIndicator from '@/components/AiReliabilityIndicator'

<AiReliabilityIndicator marketType="OVER_2_5" />
// Renders: "AI Confidence Reliability: 63% (Medium)"
```

## 🛠️ Setup

### 1. Database Migration
```bash
npx prisma migrate dev --name add-ai-prediction-feedback
```

### 2. Environment Variables
Add to `.env`:
```env
INTERNAL_API_KEY=your-secret-key-for-settlement-worker
ERROR_WEBHOOK=optional-webhook-for-error-notifications
```

### 3. Cron Job Setup
Add to crontab (runs every 15 minutes):
```bash
*/15 * * * * /usr/bin/node /path/to/your/project/scripts/ai-settlement-cron.js
```

## 📈 Calibration Formula

### Accuracy Rate
```
accuracy_rate = correct_predictions / total_predictions
```

### Calibration Factor
```
calibration_factor = 0.5 + (accuracy_rate / 2)
```

### Adjusted Probability
```
adjusted_probability = raw_probability * calibration_factor
```

### Safety Caps
- Minimum 50 samples before calibration applies
- Adjustment capped between 0.85 and 1.15
- Never modifies historical predictions

## 🎨 Market Types Supported

- **1X2**: Match Result (Home/Away/Draw)
- **BTTS**: Both Teams to Score (Yes/No)
- **OVER_2_5**: Total Goals Over/Under 2.5
- **CORNERS**: Total Corners Over/Under
- **CARDS**: Total Cards Over/Under

## 📊 Admin Dashboard

View AI performance metrics:
```typescript
import AiCalibrationDashboard from '@/components/AiCalibrationDashboard'

// Shows:
// - Total markets tracked
// - Calibration status per market
// - Accuracy rates
// - Market difficulty ranking
```

## 🔧 API Endpoints

### POST `/api/internal/ai-settlement`
Triggers the settlement worker (internal use only).

### GET `/api/ai/calibration`
Gets calibration data:
- `?marketType=OVER_2_5` - Specific market
- No params - All markets + difficulty ranking

## 🚨 Error Handling

- Failed predictions are logged but don't break the system
- Calibration data is cached to avoid repeated calculations
- Error notifications can be sent via webhook
- All operations are idempotent

## 📈 Performance Tracking

### Market Difficulty
Markets are ranked by accuracy:
- **Easy**: ≥70% accuracy
- **Medium**: 55-69% accuracy  
- **Hard**: 45-54% accuracy
- **Very Hard**: <45% accuracy

### Reliability Display
Users see reliability based on sample size:
- **<50 samples**: "Learning phase (X samples)"
- **≥50 samples**: "AI Confidence Reliability: X% (High/Medium/Low)"

## 🔮 Future Enhancements

1. **Advanced Models**: Machine learning for calibration
2. **Time-based Calibration**: Weight recent predictions more
3. **Market Segmentation**: Calibrate by league/competition
4. **User Trust Scores**: Track user confidence in AI predictions
5. **A/B Testing**: Compare calibrated vs uncalibrated performance

## 🐛 Troubleshooting

### Settlement Worker Not Running
- Check cron job configuration
- Verify INTERNAL_API_KEY environment variable
- Check logs in `logs/ai-settlement.log`

### Low Calibration Factors
- Ensure sufficient sample size (≥50 predictions)
- Check prediction quality and data quality
- Review market-specific difficulty

### API Errors
- Verify database connection
- Check Prisma client generation
- Review server logs for detailed errors

## 📞 Support

For issues with the AI prediction feedback loop:
1. Check the logs in `logs/ai-settlement.log`
2. Verify database schema is up to date
3. Ensure all environment variables are set
4. Review the admin dashboard for calibration status
