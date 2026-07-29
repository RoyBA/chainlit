import { submitMessage } from '../../support/testUtils';

describe('Compact CoT display', () => {
  it('collapses multiple steps into a single compact summary', () => {
    cy.visit('/');
    submitMessage('multi');

    // The three tool steps are grouped into a single compact summary line.
    cy.get('[data-testid="compact-steps"]').should('have.length', 1);
    cy.get('[data-testid="compact-steps-trigger"]').should(
      'contain',
      'Used 3 steps'
    );

    // The final answer renders at the root, outside the collapsed summary.
    cy.contains('Final answer').should('be.visible');

    // Individual steps stay hidden until the summary is expanded.
    cy.get('#step-tool1').should('not.exist');

    // Expanding the summary reveals the individual steps.
    cy.get('[data-testid="compact-steps-trigger"]').click();
    cy.get('#step-tool1').should('be.visible');
    cy.get('#step-tool2').should('be.visible');
    cy.get('#step-tool3').should('be.visible');
  });

  it('does not collapse a single step', () => {
    cy.visit('/');
    submitMessage('single');

    // A lone step is rendered directly, without a compact summary.
    cy.get('#step-tool1').should('be.visible');
    cy.get('[data-testid="compact-steps"]').should('not.exist');
    cy.contains('Final answer').should('be.visible');
  });

  it('counts nested steps recursively to trigger compact mode', () => {
    cy.visit('/');
    submitMessage('nested');

    // Only one top-level step, but it nests two tools, so the recursive count
    // reaches three and the compact summary is used.
    cy.get('[data-testid="compact-steps"]').should('have.length', 1);
    cy.get('[data-testid="compact-steps-trigger"]').should(
      'contain',
      'Used 3 steps'
    );

    // Expanding the summary reveals the intermediate step.
    cy.get('[data-testid="compact-steps-trigger"]').click();
    cy.get('#step-agent').should('be.visible');
  });
});
