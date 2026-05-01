// 状态管理 - SQLite数据库 (使用sql.js)
import initSqlJs from 'sql.js';
import fs from 'fs/promises';
import { existsSync } from 'fs';

export class StateManager {
  constructor(dbPath = 'state.db') {
    this.dbPath = dbPath;
    this.db = null;
    this.SQL = null;
  }

  /**
   * 初始化数据库
   */
  async init() {
    this.SQL = await initSqlJs();

    // 尝试加载现有数据库
    if (existsSync(this.dbPath)) {
      const buffer = await fs.readFile(this.dbPath);
      this.db = new this.SQL.Database(buffer);
    } else {
      this.db = new this.SQL.Database();
    }

    this.initDatabase();
  }

  /**
   * 初始化数据库表
   */
  initDatabase() {
    // 播放历史表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS plays (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        song_id TEXT NOT NULL,
        song_name TEXT NOT NULL,
        artist TEXT NOT NULL,
        album TEXT,
        played_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        context TEXT
      )
    `);

    // 用户偏好表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS preferences (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 对话历史表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 计划表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        plan TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.save();
  }

  /**
   * 保存数据库到文件
   */
  async save() {
    if (!this.db) return;
    const data = this.db.export();
    await fs.writeFile(this.dbPath, data);
  }

  /**
   * 记录播放历史
   * @param {Object} song - 歌曲信息
   * @param {Object} context - 播放上下文
   */
  addPlay(song, context = {}) {
    this.db.run(
      `INSERT INTO plays (song_id, song_name, artist, album, context)
       VALUES (?, ?, ?, ?, ?)`,
      [song.id, song.name, song.artist, song.album || '', JSON.stringify(context)]
    );
    this.save();
  }

  /**
   * 获取播放历史
   * @param {number} limit - 返回数量
   * @returns {Array} 播放历史
   */
  getPlayHistory(limit = 50) {
    const stmt = this.db.prepare(
      `SELECT * FROM plays ORDER BY played_at DESC LIMIT ?`
    );
    stmt.bind([limit]);

    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();

    return results;
  }

  /**
   * 获取最近播放的歌曲（去重）
   * @param {number} limit - 返回数量
   * @returns {Array} 最近播放的歌曲
   */
  getRecentSongs(limit = 20) {
    const stmt = this.db.prepare(`
      SELECT DISTINCT song_id, song_name, artist, album, MAX(played_at) as last_played
      FROM plays
      GROUP BY song_id
      ORDER BY last_played DESC
      LIMIT ?
    `);
    stmt.bind([limit]);

    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();

    return results;
  }

  /**
   * 保存用户偏好
   * @param {string} key - 偏好键
   * @param {any} value - 偏好值
   */
  setPreference(key, value) {
    this.db.run(
      `INSERT OR REPLACE INTO preferences (key, value, updated_at)
       VALUES (?, ?, CURRENT_TIMESTAMP)`,
      [key, JSON.stringify(value)]
    );
    this.save();
  }

  /**
   * 获取用户偏好
   * @param {string} key - 偏好键
   * @returns {any} 偏好值
   */
  getPreference(key) {
    const stmt = this.db.prepare(
      `SELECT value FROM preferences WHERE key = ?`
    );
    stmt.bind([key]);

    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return JSON.parse(row.value);
    }
    stmt.free();
    return null;
  }

  /**
   * 保存对话消息
   * @param {string} role - 角色 (user/assistant)
   * @param {string} content - 消息内容
   */
  addMessage(role, content) {
    this.db.run(
      `INSERT INTO messages (role, content) VALUES (?, ?)`,
      [role, content]
    );
    this.save();
  }

  /**
   * 获取对话历史
   * @param {number} limit - 返回数量
   * @returns {Array} 对话历史
   */
  getMessages(limit = 20) {
    const stmt = this.db.prepare(
      `SELECT * FROM messages ORDER BY created_at DESC LIMIT ?`
    );
    stmt.bind([limit]);

    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();

    return results.reverse();
  }

  /**
   * 保存今日计划
   * @param {string} date - 日期 (YYYY-MM-DD)
   * @param {string} plan - 计划内容
   */
  savePlan(date, plan) {
    this.db.run(
      `INSERT INTO plans (date, plan) VALUES (?, ?)`,
      [date, plan]
    );
    this.save();
  }

  /**
   * 获取今日计划
   * @param {string} date - 日期 (YYYY-MM-DD)
   * @returns {string|null} 计划内容
   */
  getPlan(date) {
    const stmt = this.db.prepare(
      `SELECT plan FROM plans WHERE date = ? ORDER BY created_at DESC LIMIT 1`
    );
    stmt.bind([date]);

    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return row.plan;
    }
    stmt.free();
    return null;
  }

  /**
   * 关闭数据库连接
   */
  async close() {
    if (this.db) {
      await this.save();
      this.db.close();
    }
  }
}

export default StateManager;
