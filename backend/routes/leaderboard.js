const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const Trade = require('../models/Trade');

// @route   GET /api/leaderboard
// @desc    Get trading leaderboard
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { period = 'all', limit = 50 } = req.query;
    
    // Calculate date range based on period
    let dateFilter = {};
    const now = new Date();
    
    if (period === 'daily') {
      dateFilter = { closedAt: { $gte: new Date(now.setHours(0, 0, 0, 0)) } };
    } else if (period === 'weekly') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      dateFilter = { closedAt: { $gte: weekAgo } };
    } else if (period === 'monthly') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      dateFilter = { closedAt: { $gte: monthAgo } };
    }

    // Aggregate closed trades by user
    const leaderboardData = await Trade.aggregate([
      {
        $match: {
          status: 'closed',
          ...dateFilter
        }
      },
      {
        $group: {
          _id: '$user',
          totalPnL: { $sum: '$pnl' },
          totalTrades: { $sum: 1 },
          winningTrades: {
            $sum: { $cond: [{ $gt: ['$pnl', 0] }, 1, 0] }
          },
          losingTrades: {
            $sum: { $cond: [{ $lt: ['$pnl', 0] }, 1, 0] }
          },
          totalVolume: { $sum: { $multiply: ['$lotSize', '$openPrice'] } }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      {
        $unwind: '$userInfo'
      },
      {
        $match: {
          'userInfo.isActive': true
        }
      },
      {
        $project: {
          _id: 1,
          username: {
            $concat: [
              { $substr: ['$userInfo.firstName', 0, 1] },
              '***',
              { $substr: ['$userInfo.lastName', 0, 1] }
            ]
          },
          totalPnL: { $round: ['$totalPnL', 2] },
          totalTrades: 1,
          winningTrades: 1,
          losingTrades: 1,
          winRate: {
            $round: [
              {
                $multiply: [
                  { $divide: ['$winningTrades', { $max: ['$totalTrades', 1] }] },
                  100
                ]
              },
              1
            ]
          },
          totalVolume: { $round: ['$totalVolume', 2] }
        }
      },
      {
        $sort: { totalPnL: -1 }
      },
      {
        $limit: parseInt(limit)
      }
    ]);

    // Add rank
    const rankedData = leaderboardData.map((item, index) => ({
      rank: index + 1,
      ...item
    }));

    // Get current user's rank
    const currentUserData = rankedData.find(item => item._id.toString() === req.user.id);
    let userRank = null;
    
    if (!currentUserData) {
      // User not in top list, calculate their stats
      const userTrades = await Trade.aggregate([
        {
          $match: {
            user: req.user._id,
            status: 'closed',
            ...dateFilter
          }
        },
        {
          $group: {
            _id: '$user',
            totalPnL: { $sum: '$pnl' },
            totalTrades: { $sum: 1 },
            winningTrades: {
              $sum: { $cond: [{ $gt: ['$pnl', 0] }, 1, 0] }
            }
          }
        }
      ]);

      if (userTrades.length > 0) {
        const userData = userTrades[0];
        // Count users with higher PnL
        const higherRankCount = await Trade.aggregate([
          {
            $match: {
              status: 'closed',
              ...dateFilter
            }
          },
          {
            $group: {
              _id: '$user',
              totalPnL: { $sum: '$pnl' }
            }
          },
          {
            $match: {
              totalPnL: { $gt: userData.totalPnL }
            }
          },
          {
            $count: 'count'
          }
        ]);

        userRank = {
          rank: (higherRankCount[0]?.count || 0) + 1,
          totalPnL: Math.round(userData.totalPnL * 100) / 100,
          totalTrades: userData.totalTrades,
          winRate: Math.round((userData.winningTrades / Math.max(userData.totalTrades, 1)) * 100 * 10) / 10
        };
      }
    } else {
      userRank = currentUserData;
    }

    res.json({
      success: true,
      data: {
        leaderboard: rankedData,
        userRank,
        period
      }
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching leaderboard'
    });
  }
});

// @route   GET /api/leaderboard/competitions
// @desc    Get active competitions
// @access  Private
router.get('/competitions', protect, async (req, res) => {
  try {
    // For now, return sample competitions
    // In production, this would come from a Competition model
    const competitions = [
      {
        id: 1,
        name: 'Weekly Trading Challenge',
        description: 'Compete for the highest profit this week',
        startDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
        prize: '$500',
        participants: 156,
        status: 'active'
      },
      {
        id: 2,
        name: 'Monthly Championship',
        description: 'Monthly trading competition with big prizes',
        startDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        prize: '$2,000',
        participants: 342,
        status: 'active'
      },
      {
        id: 3,
        name: 'Forex Masters',
        description: 'Forex-only trading competition',
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        prize: '$1,000',
        participants: 0,
        status: 'upcoming'
      }
    ];

    res.json({
      success: true,
      data: competitions
    });
  } catch (error) {
    console.error('Competitions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching competitions'
    });
  }
});

module.exports = router;
