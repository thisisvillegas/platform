import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface Project {
  name: string;
  description: string;
  route?: string;
  externalUrl?: string;
  icon: string;
}

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './projects.component.html',
  styleUrl: './projects.component.scss'
})
export class ProjectsComponent {
  projects: Project[] = [
    {
      name: 'Brain-Dump',
      description: 'Capture thoughts, ideas, and notes in a structured knowledge base.',
      route: '/brain-dump',
      icon: '🧠'
    },
    {
      name: 'Homecontrol',
      description: 'Smart home automation and device control dashboard.',
      route: '/homecontrol',
      icon: '🏠'
    },
    {
      name: 'Rootine',
      description: 'Daily routine tracking and habit building application.',
      route: '/rootine',
      icon: '📅'
    },
    {
      name: 'TactIQal',
      description: 'Tactical decision-making and strategy planning tool.',
      route: '/tactiqal',
      icon: '🎯'
    },
    {
      name: 'GIF Gallery',
      description: 'Personal collection of GIFs and animated media.',
      externalUrl: 'https://media.thisisvillegas.com',
      icon: '🎬'
    },
    {
      name: 'Platform World',
      description: 'Interactive 2D pixel-art portfolio world. Experience the full game.',
      route: '/world',
      icon: '🌍'
    }
  ];

  navigateToProject(project: Project): void {
    if (project.externalUrl) {
      window.open(project.externalUrl, '_blank');
    }
    // Routes are handled by RouterModule automatically
  }
}
