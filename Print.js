// 1. INITIALIZATION
// !!! IMPORTANT: Replace these with your actual Supabase credentials !!!
const SUPABASE_URL = 'https://gwrrzrxujbpnguyzpjme.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3cnJ6cnh1amJwbmd1eXpwam1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwNjY2MTMsImV4cCI6MjA3MTY0MjYxM30.tkE0LawKsbolBHrqaS3iJno-LAd7skpl9pCQ-0Tuf1w';

// Using 'db' to stay consistent with app.js and avoid naming conflicts
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const cookbookContainer = document.getElementById('cookbook-container');

// 2. LOAD DATA FROM URL
async function initPrint() {
    const params = new URLSearchParams(window.location.search);
    const ids = params.get('ids');

    if (!ids) {
        cookbookContainer.innerHTML = '<p>No recipes selected for printing.</p>';
        return;
    }

    const recipeIds = ids.split(',');
    await loadSelectedRecipes(recipeIds);
}

// 3. FETCH RECIPES FROM DATABASE
async function loadSelectedRecipes(ids) {
    const { data, error } = await db
        .from('recipes')
        .select('*')
        .in('id', ids);

    if (error) {
        console.error('Error fetching recipes for print:', error);
        cookbookContainer.innerHTML = '<p>Error loading recipes. Please try again.</p>';
        return;
    }

    renderPrintRecipes(data);
}

// 4. RENDER TO PAGE
function renderPrintRecipes(recipes) {
    cookbookContainer.innerHTML = '';

    recipes.forEach(recipe => {
        const recipeDiv = document.createElement('div');
        recipeDiv.className = 'recipe-print';
        
        // Handle ingredients list
        const ingredientsHtml = recipe.ingredients.map(ing => 
            `<li>${ing.qty} ${ing.unit || ''} ${ing.name}</li>`
        ).join('');

        // Handle instructions list
        const instructionsHtml = recipe.instructions.map(step => 
            `<li>${step}</li>`
        ).join('');

        recipeDiv.innerHTML = `
            <div class="print-recipe-card">
                <h2>${recipe.name}</h2>
                <p><strong>Category:</strong> ${recipe.category || 'N/A'} | <strong>Chef:</strong> ${recipe.author || 'N/A'}</p>
                <hr>
                <h3>Ingredients</h3>
                <ul>${ingredientsHtml}</ul>
                <h3>Instructions</h3>
                <ol>${instructionsHtml}</ol>
            </div>
        `;
        cookbookContainer.appendChild(recipeDiv);
    });
}

// Start the process
document.addEventListener('DOMContentLoaded', initPrint);
