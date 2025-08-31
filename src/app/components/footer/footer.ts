import { Component } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [MatToolbarModule],
  templateUrl: './footer.html',
  styleUrls: ['./footer.scss'],
})
export class Footer {
  year = new Date().getFullYear();
}
