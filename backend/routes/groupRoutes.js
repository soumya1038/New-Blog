const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Group = require('../models/Group');
const Message = require('../models/Message');
const multer = require('multer');
const cloudinary = require('../utils/cloudinary');

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// Create group
router.post('/', protect, async (req, res) => {
  try {
    const { name, description, memberIds } = req.body;

    if (!name || !memberIds || memberIds.length === 0) {
      return res.status(400).json({ message: 'Name and members are required' });
    }

    const group = await Group.create({
      name,
      description,
      members: [req.user._id, ...memberIds],
      admins: [req.user._id],
      createdBy: req.user._id
    });

    await group.populate('members', 'name username fullName profileImage');
    await group.populate('admins', 'name username fullName profileImage');

    res.status(201).json({ group });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user's groups
router.get('/', protect, async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user._id })
      .populate('members', 'name username fullName profileImage')
      .populate('admins', 'name username fullName profileImage')
      .populate('coAdmins', 'name username fullName profileImage')
      .populate('createdBy', 'name username fullName')
      .sort({ updatedAt: -1 });

    res.json({ groups });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get group details
router.get('/:groupId', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId)
      .populate('members', 'name username fullName profileImage')
      .populate('admins', 'name username fullName profileImage')
      .populate('coAdmins', 'name username fullName profileImage')
      .populate('createdBy', 'name username fullName profileImage');

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (!group.members.some(m => m._id.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'Not a member of this group' });
    }

    res.json({ group });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update group info
router.put('/:groupId', protect, async (req, res) => {
  try {
    const { name, description } = req.body;
    const group = await Group.findById(req.params.groupId);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const isAdmin = group.admins.some(a => a.toString() === req.user._id.toString());
    const isCoAdmin = group.coAdmins?.some(a => a.toString() === req.user._id.toString());
    
    if (!isAdmin && !isCoAdmin) {
      return res.status(403).json({ message: 'Only admins and co-admins can edit group info' });
    }

    if (name) group.name = name;
    if (description !== undefined) group.description = description;

    await group.save();
    await group.populate('members', 'name username fullName profileImage');
    await group.populate('admins', 'name username fullName profileImage');
    await group.populate('coAdmins', 'name username fullName profileImage');

    res.json({ group });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Upload group icon
router.post('/:groupId/icon', protect, upload.single('icon'), async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const isAdmin = group.admins.some(a => a.toString() === req.user._id.toString());
    const isCoAdmin = group.coAdmins?.some(a => a.toString() === req.user._id.toString());
    
    if (!isAdmin && !isCoAdmin) {
      return res.status(403).json({ message: 'Only admins and co-admins can change group icon' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Delete old icon from Cloudinary
    if (group.iconPublicId) {
      await cloudinary.uploader.destroy(group.iconPublicId);
    }

    // Upload new icon
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'group-icons', resource_type: 'image' },
      async (error, result) => {
        if (error) {
          return res.status(500).json({ message: 'Failed to upload icon' });
        }

        group.icon = result.secure_url;
        group.iconPublicId = result.public_id;
        await group.save();

        res.json({ icon: result.secure_url });
      }
    );

    const { Readable } = require('stream');
    const bufferStream = new Readable();
    bufferStream.push(req.file.buffer);
    bufferStream.push(null);
    bufferStream.pipe(uploadStream);

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add members
router.post('/:groupId/members', protect, async (req, res) => {
  try {
    const { memberIds } = req.body;
    const group = await Group.findById(req.params.groupId);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const isAdmin = group.admins.some(a => a.toString() === req.user._id.toString());
    const isCoAdmin = group.coAdmins?.some(a => a.toString() === req.user._id.toString());
    
    if (!isAdmin && !isCoAdmin) {
      return res.status(403).json({ message: 'Only admins and co-admins can add members' });
    }

    memberIds.forEach(id => {
      if (!group.members.includes(id)) {
        group.members.push(id);
      }
    });

    await group.save();
    await group.populate('members', 'name username fullName profileImage');
    await group.populate('admins', 'name username fullName profileImage');
    await group.populate('coAdmins', 'name username fullName profileImage');

    res.json({ group });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Remove member
router.delete('/:groupId/members/:memberId', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const isAdmin = group.admins.some(a => a.toString() === req.user._id.toString());
    const isCoAdmin = group.coAdmins?.some(a => a.toString() === req.user._id.toString());
    
    if (!isAdmin && !isCoAdmin && req.params.memberId !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only admins and co-admins can remove members' });
    }

    group.members = group.members.filter(m => m.toString() !== req.params.memberId);
    group.admins = group.admins.filter(a => a.toString() !== req.params.memberId);
    group.coAdmins = group.coAdmins?.filter(a => a.toString() !== req.params.memberId) || [];

    await group.save();
    await group.populate('members', 'name username fullName profileImage');
    await group.populate('admins', 'name username fullName profileImage');
    await group.populate('coAdmins', 'name username fullName profileImage');

    res.json({ group });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Make co-admin
router.post('/:groupId/co-admins/:memberId', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const isAdmin = group.admins.some(a => a.toString() === req.user._id.toString());
    if (!isAdmin) {
      return res.status(403).json({ message: 'Only admins can make co-admins' });
    }

    if (!group.coAdmins) group.coAdmins = [];
    
    if (!group.coAdmins.includes(req.params.memberId)) {
      group.coAdmins.push(req.params.memberId);
      await group.save();
    }

    await group.populate('members', 'name username fullName profileImage');
    await group.populate('admins', 'name username fullName profileImage');
    await group.populate('coAdmins', 'name username fullName profileImage');
    res.json({ group });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Remove co-admin
router.delete('/:groupId/co-admins/:memberId', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const isAdmin = group.admins.some(a => a.toString() === req.user._id.toString());
    if (!isAdmin) {
      return res.status(403).json({ message: 'Only admins can remove co-admins' });
    }

    group.coAdmins = group.coAdmins?.filter(a => a.toString() !== req.params.memberId) || [];
    await group.save();

    await group.populate('members', 'name username fullName profileImage');
    await group.populate('admins', 'name username fullName profileImage');
    await group.populate('coAdmins', 'name username fullName profileImage');
    res.json({ group });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Join group via invite code
router.post('/join/:inviteCode', protect, async (req, res) => {
  try {
    const group = await Group.findOne({ inviteCode: req.params.inviteCode });

    if (!group) {
      return res.status(404).json({ message: 'Invalid invite link' });
    }

    if (group.members.includes(req.user._id)) {
      return res.status(400).json({ message: 'You are already a member of this group' });
    }

    group.members.push(req.user._id);
    await group.save();
    await group.populate('members', 'name username fullName profileImage');
    await group.populate('admins', 'name username fullName profileImage');
    await group.populate('coAdmins', 'name username fullName profileImage');

    res.json({ group, message: 'Successfully joined the group' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Regenerate invite code
router.post('/:groupId/regenerate-invite', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const isAdmin = group.admins.some(a => a.toString() === req.user._id.toString());
    if (!isAdmin) {
      return res.status(403).json({ message: 'Only admins can regenerate invite link' });
    }

    group.inviteCode = Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    await group.save();

    res.json({ inviteCode: group.inviteCode });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Leave group
router.post('/:groupId/leave', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Remove user from all roles
    group.members = group.members.filter(m => m.toString() !== req.user._id.toString());
    group.admins = group.admins.filter(a => a.toString() !== req.user._id.toString());
    group.coAdmins = group.coAdmins?.filter(a => a.toString() !== req.user._id.toString()) || [];

    // If no members left, delete group
    if (group.members.length === 0) {
      await group.deleteOne();
      return res.json({ message: 'Group deleted (no members left)' });
    }

    // If no admins left, promote co-admin or first member to admin
    if (group.admins.length === 0 && group.members.length > 0) {
      if (group.coAdmins && group.coAdmins.length > 0) {
        // Promote first co-admin to admin
        const newAdminId = group.coAdmins[0];
        group.admins.push(newAdminId);
        group.coAdmins = group.coAdmins.filter(a => a.toString() !== newAdminId.toString());
      } else {
        // Promote first member to admin
        group.admins.push(group.members[0]);
      }
    }

    await group.save();
    res.json({ message: 'Left group successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
