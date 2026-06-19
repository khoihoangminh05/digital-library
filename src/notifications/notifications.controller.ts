import { Controller, Get, Patch, Param, UseGuards, Request, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('notifications')
@Controller('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: "Retrieve the current user's notifications (latest 50)" })
  @ApiResponse({ status: 200, description: 'Notifications returned successfully.' })
  findMy(@Request() req: any) {
    return this.notificationsService.findMy(req.user.id);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get the number of unread notifications' })
  @ApiResponse({ status: 200, description: 'Unread count returned successfully.' })
  unreadCount(@Request() req: any) {
    return this.notificationsService.unreadCount(req.user.id);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read.' })
  markAllRead(@Request() req: any) {
    return this.notificationsService.markAllRead(req.user.id);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a single notification as read' })
  @ApiParam({ name: 'id', description: 'The UUID of the notification' })
  @ApiResponse({ status: 200, description: 'Notification marked as read.' })
  @ApiResponse({ status: 404, description: 'Notification not found.' })
  markRead(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.notificationsService.markRead(id, req.user.id);
  }
}
