import * as dedent from 'dedent';

export function getRepositoryTemplate(repositoryName: string): string {
	return dedent`
        import { Repository as MedusaRepository } from "medusa-extender";
        import { EntityRepository, Repository } from "typeorm";
        
        @MedusaRepository({ resolutionKey: '${repositoryName}' })
        @EntityRepository(/* Specify your entity */)
        export default class ${repositoryName} extends Repository</* Specify your entity */> {}
    `;
}