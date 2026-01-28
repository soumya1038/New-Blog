import React, { useEffect, useState } from 'react';
import { useGroupCall } from '../context/GroupCallContext';
import GroupCallInvitationModal from './GroupCallInvitationModal';

const GlobalGroupCallListener = () => {
  const { invitation, acceptInvitation, declineInvitation } = useGroupCall();

  if (!invitation) return null;

  return (
    <GroupCallInvitationModal
      groupName={invitation.groupName}
      initiator={invitation.initiator}
      callType={invitation.callType || 'video'}
      hasActiveCall={invitation.hasActiveCall}
      onAccept={acceptInvitation}
      onReject={declineInvitation}
    />
  );
};

export default GlobalGroupCallListener;
