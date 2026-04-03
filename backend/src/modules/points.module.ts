import { Module } from '@nestjs/common';
import { 
  PointsController, 
  LeaderboardController, 
  BadgeTierController 
} from '../api/points.controller';
import { PointsService } from '../services/points.service';
import { BadgeTierService } from '../services/badge-tier.service';
import { LeaderboardService } from '../services/leaderboard.service';
import { AuthModule } from './auth.module';

@Module({
  imports: [AuthModule],
  controllers: [PointsController, LeaderboardController, BadgeTierController],
  providers: [PointsService, BadgeTierService, LeaderboardService],
  exports: [PointsService, BadgeTierService, LeaderboardService],
})
export class PointsModule {}
