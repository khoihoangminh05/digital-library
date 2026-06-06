import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AgentService } from './agent.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IsString, IsNotEmpty, IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ChatMessageDto {
  @IsString()
  @IsNotEmpty()
  role: string;

  @IsString()
  @IsNotEmpty()
  content: string;
}

export class ChatRequestDto {
  @IsString()
  @IsNotEmpty()
  message: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  history?: ChatMessageDto[];
}

export class TutorRequestDto {
  @IsString()
  @IsNotEmpty()
  bookId: string;

  @IsString()
  @IsNotEmpty()
  highlightedText: string;

  @IsString()
  @IsNotEmpty()
  question: string;
}

@ApiTags('ai-agent')
@Controller('ai')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Post('chat')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Interact with the LangGraph Multi-Agent conversational system' })
  @ApiResponse({ status: 201, description: 'Agent response generated successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async chat(@Body() chatRequestDto: ChatRequestDto) {
    const { message, history } = chatRequestDto;
    return this.agentService.chat(message, history);
  }

  @Post('tutor')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get explanation or answers about a selected book passage from the AI Tutor' })
  @ApiResponse({ status: 201, description: 'Tutor explanation generated successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async tutor(@Body() tutorRequestDto: TutorRequestDto) {
    const { bookId, highlightedText, question } = tutorRequestDto;
    return this.agentService.tutor(bookId, highlightedText, question);
  }
}
