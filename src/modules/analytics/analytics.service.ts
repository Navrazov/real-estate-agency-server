import { AnalyticsEventModel } from '../../models/AnalyticsEvent.js';

class AnalyticsService {
  async track(
    event: string,
    userId?: string,
    data?: Record<string, unknown>,
    ip?: string,
    userAgent?: string
  ): Promise<void> {
    // Fire-and-forget
    AnalyticsEventModel.create({ event, userId, data, ip, userAgent }).catch(() => {});
  }

  async getOverview(days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [totalEvents, uniqueUsersAgg, eventBreakdownAgg] = await Promise.all([
      AnalyticsEventModel.countDocuments({ createdAt: { $gte: since } }),
      AnalyticsEventModel.aggregate([
        { $match: { createdAt: { $gte: since }, userId: { $ne: null } } },
        { $group: { _id: '$userId' } },
        { $count: 'count' },
      ]),
      AnalyticsEventModel.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: '$event', count: { $sum: 1 } } },
      ]),
    ]);

    const uniqueUsers = uniqueUsersAgg[0]?.count ?? 0;
    const eventBreakdown: Record<string, number> = {};
    for (const item of eventBreakdownAgg) {
      eventBreakdown[item._id] = item.count;
    }

    return { totalEvents, uniqueUsers, eventBreakdown };
  }

  async getUserGrowth(days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const result = await AnalyticsEventModel.aggregate([
      {
        $match: {
          event: 'auth_register',
          createdAt: { $gte: since },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return result.map((item) => ({ date: item._id, count: item.count }));
  }

  async getSearchAnalytics(days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const result = await AnalyticsEventModel.aggregate([
      {
        $match: {
          event: 'search',
          createdAt: { $gte: since },
          'data.query': { $exists: true, $ne: '' },
        },
      },
      {
        $group: {
          _id: '$data.query',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]);

    return result.map((item) => ({ term: item._id, count: item.count }));
  }

  async getActiveUsers(days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const result = await AnalyticsEventModel.aggregate([
      {
        $match: {
          createdAt: { $gte: since },
          userId: { $ne: null },
        },
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            userId: '$userId',
          },
        },
      },
      {
        $group: {
          _id: '$_id.date',
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return result.map((item) => ({ date: item._id, count: item.count }));
  }
}

export const analyticsService = new AnalyticsService();
