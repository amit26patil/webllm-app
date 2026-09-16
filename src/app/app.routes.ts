import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { DayViewComponent } from './pages/day-view/day-view.component';
import { SummaryComponent } from './pages/summary/summary.component';
import { ChatComponent } from './pages/chat/chat.component';
import { SmartSearchComponent } from './pages/smart-search/smart-search.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'day/:date', component: DayViewComponent },
  { path: 'summary', component: SummaryComponent },
  { path: 'chat', component: ChatComponent },
  { path: 'search', component: SmartSearchComponent },
  { path: '**', redirectTo: '' },
];
