class ProductivityApp {
    constructor() {
        this.tasks = this.loadData('productiveflow-tasks') || [];
        this.goals = this.loadData('productiveflow-goals') || [];
        this.streaks = this.loadData('productiveflow-streaks') || { current: 0, best: 0 };
        this.trackingData = this.loadData('productiveflow-tracking') || {
            weeklyStartDate: null,
            monthlyStartDate: null,
            dailyCompletions: {}
        };
        this.initializeApp();
    }

    initializeApp() {
        this.initializeEventListeners();
        this.initializeTracking();
        this.render();
        this.updateProgressCircles();
    }

    initializeEventListeners() {
        // Task management
        document.getElementById('addTaskBtn').addEventListener('click', () => this.addTask());
        document.getElementById('taskInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addTask();
        });

        // Goal management
        document.getElementById('addGoalBtn').addEventListener('click', () => this.openGoalModal());
        document.getElementById('saveGoalBtn').addEventListener('click', () => this.saveGoal());
        document.getElementById('cancelGoalBtn').addEventListener('click', () => this.closeGoalModal());
        
        // Modal close events
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) {
                    modal.style.display = 'none';
                }
            });
        });

        // Analytics view details buttons
        document.querySelectorAll('.view-details').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = e.target.getAttribute('data-type');
                this.showAnalyticsDetails(type);
            });
        });

        // Modal close on outside click
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });

        // Smooth scrolling for navigation links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }

    initializeTracking() {
        const today = new Date().toDateString();
        
        // Initialize weekly tracking if not started
        if (!this.trackingData.weeklyStartDate) {
            this.trackingData.weeklyStartDate = new Date().toISOString();
        }
        
        // Initialize monthly tracking if not started
        if (!this.trackingData.monthlyStartDate) {
            this.trackingData.monthlyStartDate = new Date().toISOString();
        }
        
        // Initialize daily completions for today if not exists
        if (!this.trackingData.dailyCompletions[today]) {
            this.trackingData.dailyCompletions[today] = 0;
        }
        
        this.saveTrackingData();
    }

    // Task Management
    addTask() {
        const taskInput = document.getElementById('taskInput');
        const text = taskInput.value.trim();

        if (text === '') {
            this.showNotification('Please enter a task!', 'error');
            return;
        }

        const task = {
            id: Date.now().toString(),
            text: text,
            completed: false,
            createdAt: new Date().toISOString(),
            completedAt: null
        };

        this.tasks.push(task);
        this.saveData('productiveflow-tasks', this.tasks);
        this.render();
        
        taskInput.value = '';
        this.showNotification('Task added successfully!', 'success');
        taskInput.focus();
    }

    toggleTask(taskId) {
        this.tasks = this.tasks.map(task => {
            if (task.id === taskId) {
                const updatedTask = { 
                    ...task, 
                    completed: !task.completed,
                    completedAt: !task.completed ? new Date().toISOString() : null
                };
                
                // Update streaks and tracking
                if (updatedTask.completed) {
                    this.updateStreaks();
                    this.updateDailyCompletions();
                }
                
                return updatedTask;
            }
            return task;
        });
        
        this.saveData('productiveflow-tasks', this.tasks);
        this.render();
    }

    deleteTask(taskId) {
        this.tasks = this.tasks.filter(task => task.id !== taskId);
        this.saveData('productiveflow-tasks', this.tasks);
        this.render();
        this.showNotification('Task deleted!', 'info');
    }

    updateDailyCompletions() {
        const today = new Date().toDateString();
        if (!this.trackingData.dailyCompletions[today]) {
            this.trackingData.dailyCompletions[today] = 0;
        }
        this.trackingData.dailyCompletions[today]++;
        this.saveTrackingData();
    }

    // Goal Management
    openGoalModal() {
        document.getElementById('goalModal').style.display = 'block';
        document.getElementById('goalTitle').value = '';
        document.getElementById('goalDescription').value = '';
        document.getElementById('goalDeadline').value = '';
        document.getElementById('goalCategory').value = 'short';
    }

    closeGoalModal() {
        document.getElementById('goalModal').style.display = 'none';
    }

    saveGoal() {
        const title = document.getElementById('goalTitle').value.trim();
        const category = document.getElementById('goalCategory').value;
        const description = document.getElementById('goalDescription').value.trim();
        const deadline = document.getElementById('goalDeadline').value;

        if (title === '') {
            this.showNotification('Please enter a goal title!', 'error');
            return;
        }

        const goal = {
            id: Date.now().toString(),
            title: title,
            category: category,
            description: description,
            deadline: deadline,
            createdAt: new Date().toISOString(),
            completed: false
        };

        this.goals.push(goal);
        this.saveData('productiveflow-goals', this.goals);
        this.renderGoals();
        this.closeGoalModal();
        this.showNotification('Goal added successfully!', 'success');
    }

    toggleGoal(goalId) {
        this.goals = this.goals.map(goal => {
            if (goal.id === goalId) {
                return { ...goal, completed: !goal.completed };
            }
            return goal;
        });
        this.saveData('productiveflow-goals', this.goals);
        this.renderGoals();
    }

    deleteGoal(goalId) {
        this.goals = this.goals.filter(goal => goal.id !== goalId);
        this.saveData('productiveflow-goals', this.goals);
        this.renderGoals();
        this.showNotification('Goal deleted!', 'info');
    }

    // Progress Tracking
    getProgressStats(timeframe) {
        const now = new Date();
        let startDate;

        switch(timeframe) {
            case 'day':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case 'week':
                startDate = new Date(this.trackingData.weeklyStartDate);
                break;
            case 'month':
                startDate = new Date(this.trackingData.monthlyStartDate);
                break;
            default:
                startDate = new Date(0);
        }

        const filteredTasks = this.tasks.filter(task => 
            new Date(task.createdAt) >= startDate
        );

        const completed = filteredTasks.filter(task => task.completed).length;
        const total = filteredTasks.length;
        const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

        return { completed, total, completionRate, startDate };
    }

    getDaysRemaining(timeframe) {
        const startDate = new Date(this.trackingData[`${timeframe}StartDate`]);
        const now = new Date();
        
        if (timeframe === 'weekly') {
            const daysPassed = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));
            return Math.max(0, 7 - daysPassed);
        } else if (timeframe === 'monthly') {
            const daysPassed = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));
            return Math.max(0, 30 - daysPassed);
        }
        return 0;
    }

    isTrackingActive(timeframe) {
        const startDate = new Date(this.trackingData[`${timeframe}StartDate`]);
        const now = new Date();
        const daysPassed = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));
        
        if (timeframe === 'weekly') {
            return daysPassed < 7;
        } else if (timeframe === 'monthly') {
            return daysPassed < 30;
        }
        return true; // Daily is always active
    }

    updateStreaks() {
        // Simple streak tracking - in a real app, you'd check consecutive days
        this.streaks.current += 1;
        if (this.streaks.current > this.streaks.best) {
            this.streaks.best = this.streaks.current;
        }
        this.saveData('productiveflow-streaks', this.streaks);
    }

    updateProgressCircles() {
        const daily = this.getProgressStats('day');
        const weekly = this.getProgressStats('week');
        const monthly = this.getProgressStats('month');

        // Only show weekly progress if tracking is active
        const weeklyProgress = this.isTrackingActive('weekly') ? weekly.completionRate : 0;
        const monthlyProgress = this.isTrackingActive('monthly') ? monthly.completionRate : 0;

        document.getElementById('dailyProgress').textContent = `${daily.completionRate}%`;
        document.getElementById('weeklyProgress').textContent = this.isTrackingActive('weekly') ? `${weeklyProgress}%` : 'Complete';
        document.getElementById('monthlyProgress').textContent = this.isTrackingActive('monthly') ? `${monthlyProgress}%` : 'Complete';

        // Update circle progress visually
        this.updateCircleProgress('dailyProgress', daily.completionRate);
        this.updateCircleProgress('weeklyProgress', weeklyProgress);
        this.updateCircleProgress('monthlyProgress', monthlyProgress);
    }

    updateCircleProgress(elementId, percentage) {
        const element = document.getElementById(elementId);
        const circle = element.parentElement;
        circle.style.background = `conic-gradient(var(--main-color) ${percentage}%, #333 ${percentage}%)`;
    }

    // Analytics Details Modal
    showAnalyticsDetails(type) {
        const modal = document.getElementById('analyticsModal');
        const title = document.getElementById('analyticsModalTitle');
        const content = document.getElementById('analyticsContent');
        
        let detailsHTML = '';
        
        switch(type) {
            case 'daily':
                title.textContent = 'Daily Progress Details';
                const dailyStats = this.getProgressStats('day');
                detailsHTML = `
                    <div class="analytics-details">
                        <div class="detail-item">
                            <h4>Today's Completion</h4>
                            <div class="detail-value">${dailyStats.completed} / ${dailyStats.total} tasks</div>
                        </div>
                        <div class="detail-item">
                            <h4>Completion Rate</h4>
                            <div class="detail-value">${dailyStats.completionRate}%</div>
                        </div>
                        <div class="detail-item">
                            <h4>Tasks Remaining</h4>
                            <div class="detail-value">${dailyStats.total - dailyStats.completed} tasks</div>
                        </div>
                    </div>
                `;
                break;
                
            case 'weekly':
                title.textContent = 'Weekly Overview Details';
                const weeklyStats = this.getProgressStats('week');
                const daysRemainingWeekly = this.getDaysRemaining('weekly');
                const isWeeklyActive = this.isTrackingActive('weekly');
                
                detailsHTML = `
                    <div class="analytics-details">
                        <div class="detail-item">
                            <h4>Week Started</h4>
                            <div class="detail-value">${new Date(this.trackingData.weeklyStartDate).toLocaleDateString()}</div>
                        </div>
                        <div class="detail-item">
                            <h4>Weekly Completion</h4>
                            <div class="detail-value">${weeklyStats.completed} / ${weeklyStats.total} tasks</div>
                        </div>
                        <div class="detail-item">
                            <h4>Completion Rate</h4>
                            <div class="detail-value">${weeklyStats.completionRate}%</div>
                        </div>
                        <div class="detail-item">
                            <h4>Days Remaining</h4>
                            <div class="detail-value ${!isWeeklyActive ? 'completed' : ''}">
                                ${isWeeklyActive ? `${daysRemainingWeekly} days` : 'Week Complete!'}
                            </div>
                        </div>
                        ${!isWeeklyActive ? `
                        <div class="detail-item">
                            <button class="btn" onclick="app.startNewWeek()">Start New Week</button>
                        </div>
                        ` : ''}
                    </div>
                `;
                break;
                
            case 'monthly':
                title.textContent = 'Monthly Trends Details';
                const monthlyStats = this.getProgressStats('month');
                const daysRemainingMonthly = this.getDaysRemaining('monthly');
                const isMonthlyActive = this.isTrackingActive('monthly');
                
                detailsHTML = `
                    <div class="analytics-details">
                        <div class="detail-item">
                            <h4>Month Started</h4>
                            <div class="detail-value">${new Date(this.trackingData.monthlyStartDate).toLocaleDateString()}</div>
                        </div>
                        <div class="detail-item">
                            <h4>Monthly Completion</h4>
                            <div class="detail-value">${monthlyStats.completed} / ${monthlyStats.total} tasks</div>
                        </div>
                        <div class="detail-item">
                            <h4>Completion Rate</h4>
                            <div class="detail-value">${monthlyStats.completionRate}%</div>
                        </div>
                        <div class="detail-item">
                            <h4>Days Remaining</h4>
                            <div class="detail-value ${!isMonthlyActive ? 'completed' : ''}">
                                ${isMonthlyActive ? `${daysRemainingMonthly} days` : 'Month Complete!'}
                            </div>
                        </div>
                        ${!isMonthlyActive ? `
                        <div class="detail-item">
                            <button class="btn" onclick="app.startNewMonth()">Start New Month</button>
                        </div>
                        ` : ''}
                    </div>
                `;
                break;
        }
        
        content.innerHTML = detailsHTML;
        modal.style.display = 'block';
    }

    startNewWeek() {
        this.trackingData.weeklyStartDate = new Date().toISOString();
        this.saveTrackingData();
        this.updateProgressCircles();
        this.showNotification('New week started!', 'success');
        document.getElementById('analyticsModal').style.display = 'none';
    }

    startNewMonth() {
        this.trackingData.monthlyStartDate = new Date().toISOString();
        this.saveTrackingData();
        this.updateProgressCircles();
        this.showNotification('New month started!', 'success');
        document.getElementById('analyticsModal').style.display = 'none';
    }

    // Rendering
    render() {
        this.renderTasks();
        this.renderGoals();
        this.updateQuickStats();
        this.updateProgressCircles();
        this.updateAnalytics();
    }

    renderTasks() {
        const taskList = document.getElementById('taskList');
        const emptyState = document.getElementById('emptyState');

        // Filter today's tasks
        const today = new Date();
        const todayTasks = this.tasks.filter(task => {
            const taskDate = new Date(task.createdAt);
            return taskDate.toDateString() === today.toDateString();
        });

        if (todayTasks.length === 0) {
            emptyState.style.display = 'block';
            taskList.style.display = 'none';
        } else {
            emptyState.style.display = 'none';
            taskList.style.display = 'flex';
        }

        taskList.innerHTML = '';
        todayTasks.forEach(task => {
            const taskElement = this.createTaskElement(task);
            taskList.appendChild(taskElement);
        });
    }

    createTaskElement(task) {
        const taskDiv = document.createElement('div');
        taskDiv.className = `task-item ${task.completed ? 'completed' : ''}`;
        
        taskDiv.innerHTML = `
            <div class="task-checkbox ${task.completed ? 'checked' : ''}" 
                 onclick="app.toggleTask('${task.id}')"></div>
            <span class="task-text">${this.escapeHtml(task.text)}</span>
            <button class="task-delete" onclick="app.deleteTask('${task.id}')">
                <i class="fas fa-trash"></i>
            </button>
        `;

        return taskDiv;
    }

    renderGoals() {
        const categories = {
            short: document.getElementById('shortTermGoals'),
            long: document.getElementById('longTermGoals'),
            lifetime: document.getElementById('lifetimeGoals')
        };

        // Clear all goal lists
        Object.values(categories).forEach(list => list.innerHTML = '');

        // Render goals by category
        this.goals.forEach(goal => {
            const goalElement = this.createGoalElement(goal);
            categories[goal.category].appendChild(goalElement);
        });
    }

    createGoalElement(goal) {
        const goalDiv = document.createElement('div');
        goalDiv.className = `goal-item ${goal.completed ? 'completed' : ''}`;
        
        const deadlineText = goal.deadline ? 
            new Date(goal.deadline).toLocaleDateString() : 'No deadline';

        goalDiv.innerHTML = `
            <div class="goal-content">
                <div class="goal-title">${this.escapeHtml(goal.title)}</div>
                ${goal.description ? `<div class="goal-description">${this.escapeHtml(goal.description)}</div>` : ''}
                <div class="goal-meta">
                    <span>Deadline: ${deadlineText}</span>
                </div>
                <div class="goal-actions">
                    <button class="goal-btn" onclick="app.toggleGoal('${goal.id}')" title="${goal.completed ? 'Mark as incomplete' : 'Mark as complete'}">
                        <i class="fas ${goal.completed ? 'fa-undo' : 'fa-check'}"></i>
                        ${goal.completed ? ' Undo' : ' Complete'}
                    </button>
                    <button class="goal-btn delete" onclick="app.deleteGoal('${goal.id}')" title="Delete goal">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `;

        return goalDiv;
    }

    updateQuickStats() {
        const today = this.getProgressStats('day');
        const week = this.getProgressStats('week');
        const month = this.getProgressStats('month');

        document.getElementById('todayCompleted').textContent = today.completed;
        document.getElementById('weekCompleted').textContent = week.completed;
        document.getElementById('monthCompleted').textContent = month.completed;
    }

    updateAnalytics() {
        const allTimeCompleted = this.tasks.filter(task => task.completed).length;
        const totalTasks = this.tasks.length;
        const successRate = totalTasks > 0 ? Math.round((allTimeCompleted / totalTasks) * 100) : 0;

        document.getElementById('totalCompleted').textContent = allTimeCompleted;
        document.getElementById('successRate').textContent = `${successRate}%`;
        document.getElementById('currentStreak').textContent = `${this.streaks.current} days`;
        document.getElementById('bestStreak').textContent = `${this.streaks.best} days`;
    }

    // Utility Methods
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--main-color);
            color: #000000;
            padding: 12px 20px;
            border-radius: 3rem;
            box-shadow: 0 0 25px var(--main-color);
            z-index: 1000;
            animation: slideInRight 0.3s ease;
            font-weight: 600;
            font-size: 1.6rem;
            border: 2px solid #000000;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    loadData(key) {
        try {
            const saved = localStorage.getItem(key);
            return saved ? JSON.parse(saved) : null;
        } catch (error) {
            console.error('Error loading data:', error);
            return null;
        }
    }

    saveData(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            console.error('Error saving data:', error);
            this.showNotification('Error saving data!', 'error');
        }
    }

    saveTrackingData() {
        this.saveData('productiveflow-tracking', this.trackingData);
    }

    // Additional Features
    exportData() {
        const data = {
            tasks: this.tasks,
            goals: this.goals,
            streaks: this.streaks,
            tracking: this.trackingData,
            exportedAt: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `productiveflow-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showNotification('Data exported successfully!', 'success');
    }

    clearCompleted() {
        this.tasks = this.tasks.filter(task => !task.completed);
        this.saveData('productiveflow-tasks', this.tasks);
        this.render();
        this.showNotification('Completed tasks cleared!', 'success');
    }

    resetData() {
        if (confirm('Are you sure you want to reset all data? This cannot be undone.')) {
            this.tasks = [];
            this.goals = [];
            this.streaks = { current: 0, best: 0 };
            this.trackingData = {
                weeklyStartDate: new Date().toISOString(),
                monthlyStartDate: new Date().toISOString(),
                dailyCompletions: {}
            };
            this.saveData('productiveflow-tasks', this.tasks);
            this.saveData('productiveflow-goals', this.goals);
            this.saveData('productiveflow-streaks', this.streaks);
            this.saveTrackingData();
            this.render();
            this.showNotification('All data reset successfully!', 'success');
        }
    }
}

// Add CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }

    .analytics-details {
        display: flex;
        flex-direction: column;
        gap: 2rem;
    }

    .detail-item {
        background: var(--bg-color);
        padding: 2rem;
        border-radius: 1rem;
        border: 2px solid var(--main-color);
    }

    .detail-item h4 {
        font-size: 1.8rem;
        color: var(--main-color);
        margin-bottom: 1rem;
        font-weight: 600;
    }

    .detail-value {
        font-size: 2.5rem;
        font-weight: 700;
        color: var(--text-color);
    }

    .detail-value.completed {
        color: #10b981;
    }
`;
document.head.appendChild(style);

// Initialize the app when DOM is loaded
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new ProductivityApp();
});