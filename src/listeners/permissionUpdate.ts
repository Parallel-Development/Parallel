import { ApplicationCommandPermissionsUpdateData } from 'discord.js';
import Listener from '../lib/structs/Listener';
import { commandsPermissionCache } from '../lib/util/functions';

class PermissionUpdateListener extends Listener {
  constructor() {
    super('applicationCommandPermissionsUpdate');
  }

  async run(data: ApplicationCommandPermissionsUpdateData) {
    if (data.applicationId !== process.env.CLIENT_ID!) return false;

    const currentPermissions = commandsPermissionCache.get(data.guildId);
    if (!currentPermissions) return false;

    currentPermissions.set(data.id, data.permissions);
  }
}

export default PermissionUpdateListener;
