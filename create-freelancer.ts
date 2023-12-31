#!/usr/bin/env node
// @ts-ignore
import inquirer from 'inquirer'
import * as anchor from '@project-serum/anchor'
import { program, get_pda_from_seeds } from './program.js'
import {
    loadKeypairFromFile,
    readConfig,
    getNameRouterAccount,
} from './utilties.js'
import { rpcConfig } from './rpcConfig.js'
const { web3 } = anchor
async function uploadJsonToIpfs(jsonObj: object) {
    try {
        const formData = new FormData()
        formData.append('file', JSON.stringify(jsonObj))

        const response = await fetch(
            'https://gateway.ipfs.io:5001/api/v0/add',
            {
                method: 'POST',
                data: formData,
            }
        )

        if (response.ok) {
            const data = await response.json()
            return data.Hash
        } else {
            console.error('Failed to upload:', response.statusText)
            return null
        }
    } catch (error) {
        console.error('Error uploading file: ', error)
        return null
    }
}

// Questions to ask the user
const questions = [
    {
        type: 'input',
        name: 'linkedinUrl',
        message: 'Please enter your likedin url: ',
        validate: (input: string) => !!input,
    },
    {
        type: 'input',
        name: 'githubUrl',
        message: 'Input your github url:  ',
        validate: (input: string) => !!input,
    },
    {
        type: 'input',
        name: 'resumeUrl',
        message: 'Input your resume url: ',
        validate: (input: string) => !!input,
    },
    {
        type: 'input',
        name: 'otherUrl',
        message: 'Any other Url you want to include: ',
        validate: (input: string) => !!input,
    },
    {
        type: 'input',
        name: 'userName',
        message: 'User name of user doing freelance work',
        validate: (input: string) => !!input,
    },
]

inquirer.prompt(questions).then((answers:any) => {
    const jobData = {
        linkedinUrl: answers.linkedinUrl,
        githubUrl: answers.githubUrl,
        resumeUrl: answers.resumeUrl,
        otherUrl: answers.otherUrl,
    }
    uploadJsonToIpfs(jobData).then((ipfsHash) => {
        const freelancer = loadKeypairFromFile(readConfig().solanaKeyPath)
        getNameRouterAccount('defios.com', '1').then((nameRouterAccount) => {
            get_pda_from_seeds([
                Buffer.from(answers.userName),
                freelancer.publicKey.toBuffer(),
                nameRouterAccount.toBuffer(),
            ]).then(([verifiedUserAccount]) => {
                get_pda_from_seeds([
                    Buffer.from('freelance'),
                    freelancer.publicKey.toBuffer(),
                ]).then(([freelanceAccount]) => {
                    program.methods
                        .addFreelancer(ipfsHash)
                        .accounts({
                            freelancer: freelancer.publicKey,
                            freelancerVerifiedUser: verifiedUserAccount,
                            freelanceAccount: freelanceAccount,
                            systemProgram: web3.SystemProgram.programId,
                        })
                        .signers([freelancer])
                        .rpc(rpcConfig)
                        .then((_) => {
                            console.log('Freelancer created')
                        })
                })
            })
        })
    })
})
