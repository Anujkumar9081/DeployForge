const mongoose = require('mongoose');
const Task = require('../models/Task');
const logger = require('../utils/logger');

/**
 * @desc    Create a new task
 * @route   POST /api/tasks
 */
const createTask = async (req, res, next) => {
  try {
    const { title, description, status, priority, dueDate } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Task title is required and cannot be empty.',
      });
    }

    const task = await Task.create({
      title: title.trim(),
      description: description ? description.trim() : '',
      status,
      priority,
      dueDate,
    });

    logger.info(`Task created with ID: ${task.id}`);
    return res.status(201).json({
      success: true,
      data: task,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get all tasks with optional filters
 * @route   GET /api/tasks
 */
const getTasks = async (req, res, next) => {
  try {
    const { status, priority, limit = 50, page = 1 } = req.query;
    const filter = {};

    if (status) {
      filter.status = status;
    }
    if (priority) {
      filter.priority = priority;
    }

    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
    const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
    const skip = (parsedPage - 1) * parsedLimit;

    const [tasks, totalCount] = await Promise.all([
      Task.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parsedLimit),
      Task.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      count: tasks.length,
      total: totalCount,
      page: parsedPage,
      totalPages: Math.ceil(totalCount / parsedLimit),
      data: tasks,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get single task by ID
 * @route   GET /api/tasks/:id
 */
const getTaskById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ID format',
        message: `The provided ID '${id}' is not a valid MongoDB ObjectId.`,
      });
    }

    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: `Task not found with ID: ${id}`,
      });
    }

    return res.status(200).json({
      success: true,
      data: task,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update a task by ID
 * @route   PUT /api/tasks/:id
 */
const updateTask = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ID format',
        message: `The provided ID '${id}' is not a valid MongoDB ObjectId.`,
      });
    }

    // Disallow updating immutable fields
    const updates = { ...req.body };
    delete updates._id;
    delete updates.id;
    delete updates.createdAt;
    delete updates.updatedAt;

    if (updates.title !== undefined && (typeof updates.title !== 'string' || updates.title.trim().length === 0)) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Task title cannot be empty.',
      });
    }

    const task = await Task.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: `Task not found with ID: ${id}`,
      });
    }

    logger.info(`Task updated with ID: ${id}`);
    return res.status(200).json({
      success: true,
      data: task,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete a task by ID
 * @route   DELETE /api/tasks/:id
 */
const deleteTask = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ID format',
        message: `The provided ID '${id}' is not a valid MongoDB ObjectId.`,
      });
    }

    const task = await Task.findByIdAndDelete(id);

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: `Task not found with ID: ${id}`,
      });
    }

    logger.info(`Task deleted with ID: ${id}`);
    return res.status(200).json({
      success: true,
      message: 'Task deleted successfully',
      data: { id },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
};

