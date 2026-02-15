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
      name: 'Desaogo',
      description: 'Personal productivity suite — tasks, notes, finance tracking, health logs, and calendar.',
      externalUrl: 'https://desaogo.thisisvillegas.com',
      icon: '📋'
    },
    {
      name: 'GridUp',
      description: 'Grid-based builder tool for creating layouts, puzzles, and designs.',
      externalUrl: 'https://gridup.thisisvillegas.com',
      icon: '🔲'
    },
    {
      name: 'Plaza',
      description: 'Social network for sharing updates and connecting with friends.',
      externalUrl: 'https://plaza.thisisvillegas.com',
      icon: '💬'
    },
    {
      name: 'Server Stats',
      description: 'Real-time Raspberry Pi server monitoring — CPU, memory, disk, network, and processes.',
      route: '/dashboard',
      icon: '📡'
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
