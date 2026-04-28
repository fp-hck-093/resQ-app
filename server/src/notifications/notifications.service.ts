import { Injectable, Logger } from '@nestjs/common';
import Expo, { ExpoPushMessage } from 'expo-server-sdk';

@Injectable()
export class NotificationsService {
  private readonly expo = new Expo();
  private readonly logger = new Logger(NotificationsService.name);

  async sendToToken(
    pushToken: string,
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ): Promise<void> {
    if (!Expo.isExpoPushToken(pushToken)) {
      this.logger.warn(`Invalid push token: ${String(pushToken)}`);
      return;
    }

    const message: ExpoPushMessage = {
      to: pushToken,
      title,
      body,
      data,
      sound: 'default',
    };

    try {
      const chunks = this.expo.chunkPushNotifications([message]);
      for (const chunk of chunks) {
        await this.expo.sendPushNotificationsAsync(chunk);
      }
    } catch (err) {
      this.logger.error('Failed to send push notification', err);
    }
  }

  async sendToMany(
    pushTokens: string[],
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ): Promise<void> {
    const valid = pushTokens.filter((t) => Expo.isExpoPushToken(t));
    if (valid.length === 0) return;

    const messages: ExpoPushMessage[] = valid.map((to) => ({
      to,
      title,
      body,
      data,
      sound: 'default',
    }));

    try {
      const chunks = this.expo.chunkPushNotifications(messages);
      for (const chunk of chunks) {
        await this.expo.sendPushNotificationsAsync(chunk);
      }
    } catch (err) {
      this.logger.error('Failed to send push notifications', err);
    }
  }
}
