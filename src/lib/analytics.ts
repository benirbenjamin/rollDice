import { dbQuery, dbExecute } from './db';

export async function logPageView(path: string, userId?: string, ipAddress?: string, userAgent?: string) {
  try {
    const id = 'pv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    await dbExecute(
      `INSERT INTO page_views (id, user_id, path, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)`,
      [id, userId || null, path, ipAddress || 'Unknown IP', userAgent || 'Unknown Browser']
    );
  } catch (err) {
    console.error('Failed to log page view:', err);
  }
}

export async function getAnalyticsSummary() {
  try {
    const totalViews = await dbQuery(`SELECT COUNT(*) as count FROM page_views`);
    const uniqueVisitors = await dbQuery(`SELECT COUNT(DISTINCT ip_address) as count FROM page_views`);
    
    const topPages = await dbQuery(
      `SELECT path, COUNT(*) as count FROM page_views GROUP BY path ORDER BY count DESC LIMIT 5`
    );

    const recentVisitors = await dbQuery(
      `SELECT page_views.*, users.name as user_name, users.email as user_email 
       FROM page_views 
       LEFT JOIN users ON page_views.user_id = users.id 
       ORDER BY page_views.created_at DESC LIMIT 20`
    );

    return {
      totalViews: Number(totalViews[0]?.count || 0),
      uniqueVisitors: Number(uniqueVisitors[0]?.count || 0),
      topPages,
      recentVisitors,
    };
  } catch (err) {
    console.error('Failed to fetch analytics:', err);
    return { totalViews: 0, uniqueVisitors: 0, topPages: [], recentVisitors: [] };
  }
}
