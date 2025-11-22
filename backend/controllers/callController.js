const CallLog = require('../models/CallLog');

// Get call history between two users (last 3 calls)
exports.getCallHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    const callLogs = await CallLog.find({
      $or: [
        { caller: currentUserId, receiver: userId },
        { caller: userId, receiver: currentUserId }
      ]
    })
      .sort({ createdAt: -1 })
      .limit(3)
      .populate('caller', 'fullName username profileImage')
      .populate('receiver', 'fullName username profileImage');

    res.json({ callLogs });
  } catch (error) {
    console.error('Get call history error:', error);
    res.status(500).json({ message: 'Failed to fetch call history' });
  }
};

// Create call log
exports.createCallLog = async (req, res) => {
  try {
    const { receiverId, type } = req.body;
    
    const callLog = await CallLog.create({
      caller: req.user._id,
      receiver: receiverId,
      type,
      status: 'completed'
    });

    res.status(201).json({ callLog });
  } catch (error) {
    console.error('Create call log error:', error);
    res.status(500).json({ message: 'Failed to create call log' });
  }
};

// Update call log (end call, update duration)
exports.updateCallLog = async (req, res) => {
  try {
    const { callLogId } = req.params;
    const { status, duration, endedAt } = req.body;

    const callLog = await CallLog.findByIdAndUpdate(
      callLogId,
      { status, duration, endedAt },
      { new: true }
    );

    if (!callLog) {
      return res.status(404).json({ message: 'Call log not found' });
    }

    res.json({ callLog });
  } catch (error) {
    console.error('Update call log error:', error);
    res.status(500).json({ message: 'Failed to update call log' });
  }
};

// Delete individual call log
exports.deleteCallLog = async (req, res) => {
  try {
    const { callLogId } = req.params;

    const callLog = await CallLog.findById(callLogId);
    if (!callLog) {
      return res.status(404).json({ message: 'Call log not found' });
    }

    // Check if user is participant
    const isParticipant = callLog.caller.toString() === req.user._id.toString() || 
                          callLog.receiver.toString() === req.user._id.toString();
    
    if (!isParticipant) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await CallLog.deleteOne({ _id: callLogId });
    res.json({ message: 'Call log deleted successfully' });
  } catch (error) {
    console.error('Delete call log error:', error);
    res.status(500).json({ message: 'Failed to delete call log' });
  }
};
